import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check - require authenticated admin
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

    const userId = claimsData.claims.sub;

    // Verify admin role
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: isAdmin } = await supabase.rpc('is_admin', { check_user_id: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin access required' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("Checking for issues that need escalation...");

    const { data: overdueIssues, error: fetchError } = await supabase
      .from("issues")
      .select(`id, title, status, sla_deadline, escalated, escalation_level, user_id, department_id, departments(name)`)
      .neq("status", "resolved")
      .not("sla_deadline", "is", null)
      .lt("sla_deadline", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching overdue issues:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${overdueIssues?.length || 0} overdue issues`);

    const escalatedIssues: string[] = [];
    const notifications: any[] = [];

    for (const issue of overdueIssues || []) {
      const currentLevel = issue.escalation_level || 0;
      const deadline = new Date(issue.sla_deadline);
      const now = new Date();
      const hoursOverdue = (now.getTime() - deadline.getTime()) / (1000 * 60 * 60);

      let newLevel = currentLevel;
      if (hoursOverdue >= 72 && currentLevel < 3) newLevel = 3;
      else if (hoursOverdue >= 48 && currentLevel < 2) newLevel = 2;
      else if (hoursOverdue >= 24 && currentLevel < 1) newLevel = 1;

      if (newLevel > currentLevel) {
        const { error: updateError } = await supabase
          .from("issues")
          .update({ escalated: true, escalation_level: newLevel, escalated_at: new Date().toISOString() })
          .eq("id", issue.id);

        if (updateError) { console.error(`Error updating issue ${issue.id}:`, updateError); continue; }

        await supabase.from("escalation_history").insert({
          issue_id: issue.id, from_level: currentLevel, to_level: newLevel,
          reason: `Auto-escalated: ${Math.round(hoursOverdue)} hours overdue`, escalated_by: "system",
        });

        const { data: superAdmins } = await supabase.from("admins").select("user_id").eq("role", "super_admin");
        const { data: deptAdmins } = await supabase.from("admins").select("user_id").eq("department_id", issue.department_id);

        const uniqueAdminIds = [...new Set([
          ...(superAdmins?.map(a => a.user_id) || []),
          ...(deptAdmins?.map(a => a.user_id) || []),
        ])];

        for (const adminUserId of uniqueAdminIds) {
          notifications.push({
            user_id: adminUserId,
            title: `Issue Escalated to Level ${newLevel}`,
            message: `"${issue.title}" is ${Math.round(hoursOverdue)} hours overdue and has been escalated.`,
            type: "escalation", issue_id: issue.id,
          });
        }

        escalatedIssues.push(issue.id);
      }
    }

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({ success: true, escalatedCount: escalatedIssues.length, escalatedIssues }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-escalations:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
