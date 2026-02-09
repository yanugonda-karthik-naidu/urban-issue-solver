import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_url, category, issue_id } = await req.json();
    if (!image_url) throw new Error("image_url is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are a computer vision system for a civic issue reporting platform. Analyze this image and respond ONLY with valid JSON.

Evaluate the image for:
1. **Relevance**: Is this a real photo of a civic/urban issue (pothole, garbage, broken streetlight, waterlogging, road damage, etc.)?
2. **Category Match**: Does it match the reported category: "${category || 'unknown'}"?
3. **Rejection Checks**: Flag if the image is:
   - A selfie or portrait
   - A screenshot of another app/website
   - An old/stock photo (looks professionally taken or has watermarks)
   - Completely irrelevant (food, animals, indoor scenes unrelated to civic issues)
   - A duplicate or meme
   - Too blurry or dark to assess

Respond with this exact JSON format:
{
  "is_valid": true/false,
  "confidence": 0.0 to 1.0,
  "detected_type": "pothole|garbage|waterlogging|road_damage|broken_streetlight|electrical|water_issue|construction_debris|other_civic|irrelevant",
  "category_match": true/false,
  "rejection_reason": null or "selfie|screenshot|stock_photo|irrelevant|duplicate|too_blurry|too_dark",
  "damage_severity": "none|minor|moderate|severe",
  "description": "Brief description of what the image shows"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image_url } }
          ]}
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      // Return a permissive fallback so users aren't blocked
      return new Response(JSON.stringify({
        is_valid: true, confidence: 0.5, detected_type: "unknown",
        category_match: true, rejection_reason: null,
        damage_severity: "unknown", description: "AI validation unavailable, image accepted by default."
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      result = null;
    }

    if (!result) {
      return new Response(JSON.stringify({
        is_valid: true, confidence: 0.5, detected_type: "unknown",
        category_match: true, rejection_reason: null,
        damage_severity: "unknown", description: "Could not parse AI response, image accepted."
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // If issue_id provided, update the issue record
    if (issue_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("issues").update({
        image_validation_status: result.is_valid ? "valid" : "rejected",
        image_validation_confidence: result.confidence,
        image_validation_reasoning: result.description,
      }).eq("id", issue_id);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("validate-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
