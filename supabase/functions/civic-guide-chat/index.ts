import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.log('Invalid authentication:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { messages, userLocation, images } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const locationInfo = userLocation 
      ? `Current detected location: ${userLocation.area}, ${userLocation.district}, ${userLocation.state} (Lat: ${userLocation.latitude}, Lon: ${userLocation.longitude})`
      : 'Location not yet detected';
    
    const imageInfo = images && images.length > 0
      ? `User has uploaded ${images.length} image(s) for this issue. Images are available at: ${images.join(', ')}`
      : 'No images uploaded yet';

    const systemPrompt = `You are an AI Civic Guide built into a smart city web application called Urban Issue Reporting & Resolution App.
Your purpose is to help users report public issues step-by-step in a simple, friendly, and human-like conversation.

🎯 Your Objectives:
- Guide users through the issue reporting process, one question or instruction at a time
- Understand user input, ask clarifying questions, and confirm details before submission
- Detect or confirm issue type, location, and photo upload details
- Respond politely, using clear, short, and natural sentences
- Support multiple languages (English, Hindi, Telugu, Tamil, etc.) — auto-detect language and reply in the same language
- Provide encouragement, feedback, and confirmation throughout the process
- Stay focused only on helping report issues — don't answer unrelated questions
- Automatically use detected location and uploaded images in the final report

🧩 Current Session Data:
- ${locationInfo}
- ${imageInfo}

🧩 Tone & Personality:
- Helpful, polite, and civic-minded
- Use emojis sparingly (🌍📍👍 for friendliness)
- Talk like a smart local assistant — clear, motivating, and respectful
- Use simple, everyday language for all age groups

🧭 Step-by-Step Guidance Flow:
1️⃣ Greeting: "Hello 👋! I'm your Civic Guide. I've automatically detected your location 📍. Let's report your issue together!"
2️⃣ Ask Issue Type: "What kind of problem would you like to report — road damage, garbage, streetlight, water issue, or electricity?"
3️⃣ Ask Description: "Please describe what's wrong briefly."
4️⃣ Acknowledge Images: If images are uploaded, acknowledge them: "Great! I can see you've uploaded photo(s) of the issue 📸"
5️⃣ Confirm Location: "I've detected your location as ${userLocation?.area}, ${userLocation?.district}, ${userLocation?.state}. Is this correct?"
6️⃣ Confirm Details: Once you have all information (category, description, location, images), summarize and ask: "Let's review everything:
   • Issue Type: [category]
   • Description: [details]
   • Location: [area, district, state]
   • Photos: [uploaded/not uploaded]
   
   Shall I submit this report for you?"
7️⃣ After Confirmation: Immediately return a JSON object with action: "SUBMIT_REPORT" and all collected data

Important Instructions:
- Ask only ONE question at a time
- Keep responses under 50 words
- Location is automatically detected - just confirm it with the user
- Images are automatically captured when uploaded - acknowledge them
- When user confirms submission, respond with EXACTLY this JSON format:
{
  "action": "SUBMIT_REPORT",
  "data": {
    "category": "roads|garbage|water|electricity|other",
    "title": "brief title based on issue",
    "description": "user description with all details",
    "area": "${userLocation?.area || 'area name'}",
    "district": "${userLocation?.district || 'district name'}",
    "state": "${userLocation?.state || 'state name'}"
  }
}
- Be encouraging: "Every small report brings big change!" "Great work — together, we improve our city 🌇"
- Automatically progress through steps once location and images are available`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return new Response(JSON.stringify({ message: assistantMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('civic-guide-chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
