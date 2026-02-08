import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are ANALYSER, a calm, professional AI reasoning system designed to help users think clearly about complex situations.

Your role is to provide structured, actionable analysis without panic or moral judgment. You help users:
- Understand their situation clearly
- Identify risks and root causes
- Get concrete next steps
- Stay calm and in control

IMPORTANT: Always respond with a JSON object containing exactly these 5 sections:
1. summary: A calm, clear 2-3 sentence overview of the situation
2. keyRisks: An array of 2-4 potential risks or concerns
3. rootCauses: An array of 2-4 underlying causes or contributing factors
4. recommendedSteps: An array of 3-5 specific, actionable next steps
5. warnings: An array of 0-3 important things to avoid or be careful about

Your tone must be:
- Calm and reassuring
- Professional and neutral
- Clear and direct
- Never panicked or alarmist
- Never morally judgmental

Focus on clarity and practical guidance. Help the user feel they understand their situation and have a clear path forward.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { situation } = await req.json();
    
    if (!situation || typeof situation !== "string") {
      return new Response(
        JSON.stringify({ error: "Please provide a situation to analyze" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing situation:", situation.substring(0, 100) + "...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Please analyze this situation and provide structured guidance:\n\n${situation}` },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Service credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No analysis generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI response received, parsing...");

    // Try to parse JSON from the response
    let analysisResult;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      analysisResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Create a fallback structured response
      analysisResult = {
        summary: content.substring(0, 500),
        keyRisks: ["Unable to parse detailed risks - please try again"],
        rootCauses: ["Unable to parse root causes - please try again"],
        recommendedSteps: ["Review the situation and try submitting again with more details"],
        warnings: [],
      };
    }

    // Ensure all required fields exist
    const result = {
      summary: analysisResult.summary || "Analysis complete.",
      keyRisks: Array.isArray(analysisResult.keyRisks) ? analysisResult.keyRisks : [],
      rootCauses: Array.isArray(analysisResult.rootCauses) ? analysisResult.rootCauses : [],
      recommendedSteps: Array.isArray(analysisResult.recommendedSteps) ? analysisResult.recommendedSteps : [],
      warnings: Array.isArray(analysisResult.warnings) ? analysisResult.warnings : [],
    };

    console.log("Analysis complete");

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
