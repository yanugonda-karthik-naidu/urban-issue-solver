import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { issue_id } = await req.json();
    if (!issue_id) {
      return new Response(JSON.stringify({ error: "issue_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the issue with department info
    const { data: issue, error: issueError } = await supabase
      .from("issues")
      .select("*, departments(name, sla_hours)")
      .eq("id", issue_id)
      .single();

    if (issueError || !issue) {
      console.error("Error fetching issue:", issueError);
      return new Response(JSON.stringify({ error: "Issue not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: nearbyCount } = await supabase.rpc("count_nearby_reports", {
      p_issue_id: issue_id,
      p_category: issue.category,
      p_district: issue.district || "",
      p_area: issue.area || "",
    });

    const hoursOpen = (Date.now() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60);

    let slaBreached = false;
    let hoursOverdue = 0;
    if (issue.sla_deadline && issue.status !== "resolved") {
      const deadline = new Date(issue.sla_deadline);
      if (Date.now() > deadline.getTime()) {
        slaBreached = true;
        hoursOverdue = (Date.now() - deadline.getTime()) / (1000 * 60 * 60);
      }
    }

    const aiPrompt = `You are an AI urban issue severity analyzer for a government civic complaint platform. 
Analyze this reported civic issue and compute a severity score from 0-100.

## Issue Details:
- Title: ${issue.title}
- Description: ${issue.description}
- Category: ${issue.category}
- Location: Area: ${issue.area || "unknown"}, District: ${issue.district || "unknown"}, State: ${issue.state || "unknown"}
- Has Photo: ${issue.photo_url ? "Yes" : "No"}
- Photo URL: ${issue.photo_url || "None"}
- Anonymous Report: ${issue.is_anonymous ? "Yes" : "No"}
- Trust Score at Creation: ${issue.trust_score_at_creation || 50}
- Similar Reports in Area (30 days): ${nearbyCount || 0}
- Hours Since Reported: ${Math.round(hoursOpen)}
- SLA Breached: ${slaBreached ? `Yes (${Math.round(hoursOverdue)} hours overdue)` : "No"}
- Current Status: ${issue.status}
- Escalation Level: ${issue.escalation_level || 0}

## Scoring Criteria:

### Location Sensitivity (0-25 points)
- Near schools, hospitals, highways, government buildings = HIGH (20-25)
- Residential areas = MEDIUM (10-15)
- Isolated/low-traffic zones = LOW (5-10)

### Report Clustering (0-20 points)
- 0 similar reports = 0 points
- 1-2 similar reports = 5 points
- 3-5 similar reports = 10 points
- 6-10 similar reports = 15 points
- 10+ similar reports = 20 points

### Time Urgency (0-25 points)
- Category urgency: electricity/water > roads > sanitation > other
- SLA breached adds 10-15 points

### Impact Assessment (0-30 points)
- Based on description: public safety risk, number of people affected
- Infrastructure damage level

## Response Format (STRICT JSON only):
{
  "severity_score": <number 0-100>,
  "severity_level": "<critical|high|medium|low>",
  "location_sensitivity": "<high|medium|low>",
  "reasoning": "<2-3 sentence explanation>",
  "risk_factors": ["<factor1>", "<factor2>"],
  "recommended_action": "<brief recommendation>"
}

Return ONLY valid JSON, no markdown.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a severity scoring AI. Return only valid JSON." },
          { role: "user", content: aiPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return await fallbackSeverity(supabase, issue, nearbyCount || 0, hoursOpen, slaBreached, hoursOverdue, issue_id);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return await fallbackSeverity(supabase, issue, nearbyCount || 0, hoursOpen, slaBreached, hoursOverdue, issue_id);
    }

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return await fallbackSeverity(supabase, issue, nearbyCount || 0, hoursOpen, slaBreached, hoursOverdue, issue_id);
    }

    const severityScore = Math.max(0, Math.min(100, parsed.severity_score || 50));
    const severityLevel = parsed.severity_level || classifyScore(severityScore);
    const locationSensitivity = parsed.location_sensitivity || "medium";
    const reasoning = parsed.reasoning || "AI-analyzed severity assessment";

    const { error: updateError } = await supabase
      .from("issues")
      .update({
        ai_severity_score: severityScore,
        ai_severity_level: severityLevel,
        ai_severity_reasoning: reasoning,
        location_sensitivity_zone: locationSensitivity,
        nearby_reports_count: nearbyCount || 0,
      })
      .eq("id", issue_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update issue" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (severityLevel === "critical") {
      await createCriticalAlerts(supabase, issue, severityScore, reasoning);
    }

    return new Response(
      JSON.stringify({
        success: true,
        severity_score: severityScore,
        severity_level: severityLevel,
        location_sensitivity: locationSensitivity,
        reasoning,
        risk_factors: parsed.risk_factors || [],
        recommended_action: parsed.recommended_action || "",
        nearby_reports: nearbyCount || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in calculate-severity:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function classifyScore(score: number): string {
  if (score >= 76) return "critical";
  if (score >= 51) return "high";
  if (score >= 26) return "medium";
  return "low";
}

async function createCriticalAlerts(supabase: any, issue: any, score: number, reasoning: string) {
  try {
    const { data: admins } = await supabase
      .from("admins")
      .select("user_id")
      .or(`role.eq.super_admin,department_id.eq.${issue.department_id}`);

    if (!admins || admins.length === 0) return;

    const uniqueAdminIds = [...new Set(admins.map((a: any) => a.user_id))];
    const notifications = uniqueAdminIds.map((adminUserId) => ({
      user_id: adminUserId,
      title: `🚨 CRITICAL Issue Detected (Score: ${score})`,
      message: `"${issue.title}" has been AI-classified as CRITICAL. ${reasoning}`,
      type: "critical_severity",
      issue_id: issue.id,
    }));

    await supabase.from("notifications").insert(notifications);
  } catch (e) {
    console.error("Error in createCriticalAlerts:", e);
  }
}

async function fallbackSeverity(
  supabase: any, issue: any, nearbyCount: number, hoursOpen: number,
  slaBreached: boolean, hoursOverdue: number, issue_id: string
) {
  let score = 30;
  const categoryScores: Record<string, number> = {
    electricity: 15, water: 15, roads: 10, sanitation: 8, traffic: 12, other: 5,
  };
  score += categoryScores[issue.category] || 5;
  score += Math.min(nearbyCount * 3, 20);
  if (hoursOpen > 72) score += 10;
  else if (hoursOpen > 48) score += 7;
  else if (hoursOpen > 24) score += 4;
  if (slaBreached) score += Math.min(Math.round(hoursOverdue / 4), 15);
  score += (issue.escalation_level || 0) * 5;
  if (issue.is_anonymous) score -= 5;
  score = Math.max(0, Math.min(100, score));
  const level = classifyScore(score);

  await supabase.from("issues").update({
    ai_severity_score: score, ai_severity_level: level,
    ai_severity_reasoning: "Rule-based severity calculation (AI fallback)",
    location_sensitivity_zone: "medium", nearby_reports_count: nearbyCount,
  }).eq("id", issue_id);

  return new Response(
    JSON.stringify({ success: true, severity_score: score, severity_level: level, reasoning: "Rule-based severity calculation (AI unavailable)", fallback: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
