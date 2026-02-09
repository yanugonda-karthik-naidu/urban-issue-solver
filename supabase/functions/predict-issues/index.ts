import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { forecast_days = 30 } = await req.json().catch(() => ({}));
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch historical issues (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: issues, error } = await supabase
      .from("issues")
      .select("id, category, area, district, state, status, created_at, resolved_at, ai_severity_score, latitude, longitude")
      .gte("created_at", sixMonthsAgo.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!issues || issues.length === 0) {
      return new Response(JSON.stringify({ predictions: [], summary: "No historical data available for predictions." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate data by location
    const locationStats: Record<string, {
      area: string; district: string; state: string;
      total: number; pending: number; categories: Record<string, number>;
      monthly: Record<string, number>; avgSeverity: number;
      lat: number | null; lng: number | null;
    }> = {};

    for (const issue of issues) {
      const key = `${issue.district || 'unknown'}::${issue.area || 'unknown'}`;
      if (!locationStats[key]) {
        locationStats[key] = {
          area: issue.area || "Unknown", district: issue.district || "Unknown",
          state: issue.state || "Unknown", total: 0, pending: 0,
          categories: {}, monthly: {}, avgSeverity: 0,
          lat: issue.latitude, lng: issue.longitude,
        };
      }
      const s = locationStats[key];
      s.total++;
      if (issue.status === "pending") s.pending++;
      s.categories[issue.category] = (s.categories[issue.category] || 0) + 1;
      const month = issue.created_at?.slice(0, 7) || "unknown";
      s.monthly[month] = (s.monthly[month] || 0) + 1;
      s.avgSeverity += issue.ai_severity_score || 0;
      if (!s.lat && issue.latitude) { s.lat = issue.latitude; s.lng = issue.longitude; }
    }

    // Calculate predictions using trend analysis
    const predictions = Object.entries(locationStats).map(([key, stats]) => {
      stats.avgSeverity = stats.total > 0 ? Math.round(stats.avgSeverity / stats.total) : 0;

      // Monthly trend: is issue count increasing?
      const months = Object.entries(stats.monthly).sort((a, b) => a[0].localeCompare(b[0]));
      let trend: "increasing" | "stable" | "decreasing" = "stable";
      if (months.length >= 2) {
        const recent = months.slice(-2).reduce((s, [, c]) => s + c, 0);
        const older = months.slice(0, Math.max(1, months.length - 2)).reduce((s, [, c]) => s + c, 0);
        const avgRecent = recent / 2;
        const avgOlder = older / Math.max(1, months.length - 2);
        if (avgRecent > avgOlder * 1.3) trend = "increasing";
        else if (avgRecent < avgOlder * 0.7) trend = "decreasing";
      }

      // Dominant category
      const topCategory = Object.entries(stats.categories)
        .sort((a, b) => b[1] - a[1])[0];

      // Risk score: combination of volume, trend, pending ratio, severity
      const pendingRatio = stats.total > 0 ? stats.pending / stats.total : 0;
      const trendMultiplier = trend === "increasing" ? 1.5 : trend === "decreasing" ? 0.6 : 1;
      const riskScore = Math.min(100, Math.round(
        (stats.total * 2 + stats.pending * 5 + stats.avgSeverity * 0.5) * trendMultiplier + pendingRatio * 20
      ));

      let riskLevel: "critical" | "high" | "medium" | "low" = "low";
      if (riskScore >= 70) riskLevel = "critical";
      else if (riskScore >= 50) riskLevel = "high";
      else if (riskScore >= 25) riskLevel = "medium";

      // Predicted issues in forecast window
      const monthlyAvg = stats.total / Math.max(1, months.length);
      const forecastMultiplier = trend === "increasing" ? 1.4 : trend === "decreasing" ? 0.7 : 1;
      const predictedCount = Math.round(monthlyAvg * (forecast_days / 30) * forecastMultiplier);

      return {
        location: stats.area !== "Unknown" ? stats.area : stats.district,
        area: stats.area, district: stats.district, state: stats.state,
        latitude: stats.lat, longitude: stats.lng,
        historical_count: stats.total, pending_count: stats.pending,
        risk_score: riskScore, risk_level: riskLevel, trend,
        predicted_issues: predictedCount,
        top_category: topCategory?.[0] || "unknown",
        top_category_count: topCategory?.[1] || 0,
        avg_severity: stats.avgSeverity,
        categories: stats.categories,
      };
    })
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 20);

    // Use AI for summary insight
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiSummary = "";

    if (LOVABLE_API_KEY && predictions.length > 0) {
      try {
        const top5 = predictions.slice(0, 5).map(p =>
          `${p.location}: risk=${p.risk_score}, trend=${p.trend}, predicted=${p.predicted_issues}, top_category=${p.top_category}`
        ).join("\n");

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "You are an urban governance AI analyst. Give a brief 2-3 sentence actionable summary of predicted urban issues. Be specific about locations and categories." },
              { role: "user", content: `Forecast period: ${forecast_days} days. Top risk areas:\n${top5}` }
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          aiSummary = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("AI summary failed:", e);
      }
    }

    return new Response(JSON.stringify({
      predictions,
      forecast_days,
      total_issues_analyzed: issues.length,
      ai_summary: aiSummary,
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("predict-issues error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
