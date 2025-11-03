import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userLocation } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

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

🧩 Tone & Personality:
- Helpful, polite, and civic-minded
- Use emojis sparingly (🌍📍👍 for friendliness)
- Talk like a smart local assistant — clear, motivating, and respectful
- Use simple, everyday language for all age groups

🧭 Step-by-Step Guidance Flow:
1️⃣ Greeting: "Hello 👋! I'm your Civic Guide. Let's report your issue together step-by-step."
2️⃣ Ask Issue Type: "What kind of problem would you like to report — road damage, garbage, streetlight, water issue, or electricity?"
3️⃣ Ask Description: "Please describe what's wrong briefly."
4️⃣ Ask for Photo: "Can you upload or capture a photo of the issue? It helps authorities identify it faster."
5️⃣ Fetch Location: ${userLocation ? `"I've detected your location 📍 — ${userLocation.area}, ${userLocation.district}, ${userLocation.state}. Do you want to use this location or change it?"` : '"Can you share your location or tell me the area, district, and state?"'}
6️⃣ Confirm Details: Once you have all information (category, description, location), summarize and ask: "Let's check everything before submission — [list details]. Shall I submit this report for you?"
7️⃣ After Confirmation: Return a JSON object with action: "SUBMIT_REPORT" and all collected data

Important Instructions:
- Ask only ONE question at a time
- Keep responses under 50 words
- When user confirms submission, respond with EXACTLY this JSON format:
{
  "action": "SUBMIT_REPORT",
  "data": {
    "category": "roads|garbage|water|electricity|other",
    "title": "brief title",
    "description": "user description",
    "area": "area name",
    "district": "district name",
    "state": "state name"
  }
}
- Be encouraging: "Every small report brings big change!" "Great work — together, we improve our city 🌇"`;

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
