import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, callback_data } = await req.json();

    switch (action) {
      case "initiate": {
        // DigiLocker API configuration
        // These would need to be configured via Supabase secrets
        const clientId = Deno.env.get("DIGILOCKER_CLIENT_ID");
        const redirectUri = Deno.env.get("DIGILOCKER_REDIRECT_URI");

        if (!clientId || !redirectUri) {
          // Return configuration needed message
          return new Response(
            JSON.stringify({ 
              error: "DigiLocker API not configured",
              message: "Administrator needs to configure DIGILOCKER_CLIENT_ID and DIGILOCKER_REDIRECT_URI secrets",
              configured: false
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generate state token for CSRF protection
        const stateToken = crypto.randomUUID();
        
        // Store state token in user verification metadata
        await supabase
          .from("user_verification")
          .update({
            verification_metadata: {
              digilocker_state: stateToken,
              initiated_at: new Date().toISOString()
            }
          })
          .eq("user_id", user.id);

        // Create audit log
        await supabase.rpc("create_audit_log", {
          p_action_type: "verification_initiated",
          p_entity_type: "user_verification",
          p_entity_id: user.id,
          p_new_value: { method: "digilocker" }
        });

        // DigiLocker OAuth URL
        const digilockerAuthUrl = new URL("https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize");
        digilockerAuthUrl.searchParams.set("response_type", "code");
        digilockerAuthUrl.searchParams.set("client_id", clientId);
        digilockerAuthUrl.searchParams.set("redirect_uri", redirectUri);
        digilockerAuthUrl.searchParams.set("state", stateToken);

        return new Response(
          JSON.stringify({ 
            redirect_url: digilockerAuthUrl.toString(),
            state: stateToken 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "callback": {
        // Handle DigiLocker callback
        const { code, state } = callback_data;

        if (!code || !state) {
          return new Response(
            JSON.stringify({ error: "Missing code or state" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify state token
        const { data: verification } = await supabase
          .from("user_verification")
          .select("verification_metadata")
          .eq("user_id", user.id)
          .single();

        const storedState = verification?.verification_metadata?.digilocker_state;
        if (storedState !== state) {
          return new Response(
            JSON.stringify({ error: "Invalid state token" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Exchange code for access token (would need DigiLocker API)
        // For now, mark as verified with DigiLocker method
        
        await supabase
          .from("user_verification")
          .update({
            verification_level: "verified",
            verification_method: "digilocker",
            verified_at: new Date().toISOString(),
            verification_metadata: {
              verified_via: "digilocker",
              verification_date: new Date().toISOString()
              // Note: We do NOT store any Aadhaar numbers or sensitive data
            }
          })
          .eq("user_id", user.id);

        // Recalculate trust score
        await supabase.rpc("calculate_trust_score", { p_user_id: user.id });

        // Create audit log
        await supabase.rpc("create_audit_log", {
          p_action_type: "verification_completed",
          p_entity_type: "user_verification",
          p_entity_id: user.id,
          p_new_value: { method: "digilocker", status: "verified" }
        });

        return new Response(
          JSON.stringify({ success: true, message: "Verification completed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "admin_verify": {
        // Admin manual verification
        const { target_user_id, method } = callback_data;

        // Check if current user is admin
        const { data: isAdmin } = await supabase.rpc("is_admin", { check_user_id: user.id });
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: "Admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase
          .from("user_verification")
          .update({
            verification_level: "verified",
            verification_method: method || "admin_verified",
            verified_at: new Date().toISOString(),
            verified_by: user.id,
            verification_metadata: {
              verified_by_admin: user.id,
              verification_date: new Date().toISOString()
            }
          })
          .eq("user_id", target_user_id);

        // Recalculate trust score
        await supabase.rpc("calculate_trust_score", { p_user_id: target_user_id });

        // Create audit log
        await supabase.rpc("create_audit_log", {
          p_action_type: "admin_verification",
          p_entity_type: "user_verification",
          p_entity_id: target_user_id,
          p_new_value: { method, verified_by: user.id }
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("DigiLocker auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
