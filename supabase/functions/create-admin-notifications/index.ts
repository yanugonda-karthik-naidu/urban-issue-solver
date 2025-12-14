import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid notification types
const VALID_NOTIFICATION_TYPES = ['new_issue', 'status_update'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create a client with the user's auth token to verify their identity
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message || 'No user found');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Authenticated user:', user.id);

    const body = await req.json();
    const { notifications, issue_id } = body;

    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid payload: notifications array required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate notification structure and content
    for (const notif of notifications) {
      if (!notif.user_id || !notif.title || !notif.message || !notif.type) {
        return new Response(JSON.stringify({ error: 'Invalid notification structure: user_id, title, message, and type are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Validate content length
      if (notif.title.length > 200) {
        return new Response(JSON.stringify({ error: 'Notification title must be less than 200 characters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (notif.message.length > 500) {
        return new Response(JSON.stringify({ error: 'Notification message must be less than 500 characters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Validate notification type
      if (!VALID_NOTIFICATION_TYPES.includes(notif.type)) {
        return new Response(JSON.stringify({ error: `Invalid notification type. Must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Use service role client for checking existing notifications
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // If issue_id is provided, verify the user owns the issue (for new issue notifications)
    if (issue_id) {
      const { data: issue, error: issueError } = await userClient.from('issues').select('user_id, created_at').eq('id', issue_id).single();
      if (issueError || !issue) {
        console.error('Issue not found:', issueError?.message);
        return new Response(JSON.stringify({ error: 'Issue not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (issue.user_id !== user.id) {
        console.error('User does not own the issue');
        return new Response(JSON.stringify({ error: 'Forbidden: You can only notify about your own issues' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Idempotency check: prevent duplicate notifications for the same issue
      const { data: existingNotifications } = await adminClient
        .from('notifications')
        .select('id')
        .eq('issue_id', issue_id)
        .eq('type', 'new_issue')
        .limit(1);
      
      if (existingNotifications && existingNotifications.length > 0) {
        console.log('Notifications already exist for this issue, skipping');
        return new Response(
          JSON.stringify({ data: null, success: true, message: 'Notifications already created for this issue' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Time-based validation: only allow notification creation within 60 seconds of issue creation
      const issueAge = Date.now() - new Date(issue.created_at).getTime();
      if (issueAge > 60000) {
        console.error('Issue is too old to create notifications for');
        return new Response(
          JSON.stringify({ error: 'Notifications can only be created immediately after issue creation' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data, error } = await adminClient.from('notifications').insert(notifications);
    if (error) {
      console.error('Failed to insert notifications:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Notifications created successfully for user:', user.id);
    return new Response(JSON.stringify({ data, success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('create-admin-notifications error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
