import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stage-specific AI behavior instructions
const STAGE_BEHAVIORS: Record<string, string> = {
  client_onboarding: `CURRENT STAGE: Client Onboarding
Your behavior in this stage:
- Ask clarifying questions to understand the client and their needs
- Rephrase client goals to confirm understanding
- Identify missing basics (budget, timeline, decision-makers)
- Help establish clear expectations
Signal readiness to advance when: client goals are clear, communication is established, project parameters identified.`,

  requirements: `CURRENT STAGE: Requirements
Your behavior in this stage:
- Summarize and confirm scope
- Highlight contradictions or gaps in requirements
- Stop exploratory questions — focus on locking in specifics
- Help document deliverables and timeline
Signal readiness to advance when: scope is documented, deliverables defined, timeline set.`,

  first_draft: `CURRENT STAGE: First Draft
Your behavior in this stage:
- Reassure the user during creation
- Prevent premature feedback panic
- Help focus on execution over perfection
- Address blockers calmly
Signal readiness to advance when: first version is complete and ready for client review.`,

  client_feedback: `CURRENT STAGE: Client Feedback
Your behavior in this stage:
- Help translate emotional feedback into actionable items
- Reframe vague feedback into specific requests
- Suggest response language for difficult feedback
- Watch for scope creep disguised as feedback
Signal readiness to advance when: feedback is documented and next steps are clear.`,

  revision: `CURRENT STAGE: Revision
Your behavior in this stage:
- Help contain scope — refinement, not rebuilding
- Protect project boundaries politely
- Identify when "one more thing" becomes scope creep
- Support firm but professional communication
Signal readiness to advance when: agreed changes implemented, client confirms satisfaction.`,

  final_delivery: `CURRENT STAGE: Final Delivery
Your behavior in this stage:
- Help package the final delivery professionally
- Prepare confirmation language
- Ensure clear handoff documentation
- Watch for last-minute change requests
Signal readiness to advance when: deliverables provided, client confirms receipt.`,

  payment: `CURRENT STAGE: Payment
Your behavior in this stage:
- Keep tone neutral and professional
- Be firm if payment is delayed
- Help draft follow-up communications
- Prepare for potential disputes calmly
Signal readiness to close when: payment confirmed, project formally closed.`,
};

// Risk pattern detection keywords
const RISK_PATTERNS = {
  scope_creep: [
    "one more thing",
    "small change",
    "quick addition",
    "while you're at it",
    "can you also",
    "just add",
    "shouldn't take long",
    "easy fix",
    "minor tweak",
  ],
  payment_risk: [
    "tight budget",
    "pay later",
    "can't pay yet",
    "payment delayed",
    "invoice issue",
    "need more time to pay",
    "financial difficulty",
  ],
  communication_risk: [
    "not responding",
    "ghosting",
    "no reply",
    "haven't heard back",
    "ignoring messages",
    "delayed response",
  ],
  timeline_risk: [
    "running late",
    "behind schedule",
    "need extension",
    "deadline issue",
    "can't make it",
    "delayed delivery",
  ],
};

// Analyze messages for risk patterns
function detectRiskPatterns(messages: Message[]): { 
  detectedRisks: string[]; 
  riskScore: number;
  suggestedHealth: "healthy" | "watch" | "at_risk";
} {
  const detectedRisks: string[] = [];
  let riskScore = 0;
  
  const recentMessages = messages.slice(-10); // Analyze last 10 messages
  const conversationText = recentMessages.map(m => m.content.toLowerCase()).join(" ");
  
  for (const [riskType, patterns] of Object.entries(RISK_PATTERNS)) {
    for (const pattern of patterns) {
      if (conversationText.includes(pattern.toLowerCase())) {
        if (!detectedRisks.includes(riskType)) {
          detectedRisks.push(riskType);
          riskScore += 1;
        }
        break;
      }
    }
  }
  
  // Determine suggested health based on risk score
  let suggestedHealth: "healthy" | "watch" | "at_risk" = "healthy";
  if (riskScore >= 3) {
    suggestedHealth = "at_risk";
  } else if (riskScore >= 1) {
    suggestedHealth = "watch";
  }
  
  return { detectedRisks, riskScore, suggestedHealth };
}

const ANALYSER_SYSTEM_PROMPT = `You are ANALYSER, a calm and highly experienced project advisor.

You operate inside an active project workspace.
This is not a general chat.
Every response must be grounded in the project's current stage, history, and momentum.

Your role is to help the user:
• think clearly
• feel in control
• make confident decisions
• avoid unnecessary risk

You speak with quiet authority.
You do not speculate.
You do not over-explain.
You do not ask unnecessary questions.

Your guidance should feel like:
"Someone competent is handling this with me."

CORE BEHAVIOR RULES:
• Maintain full conversational continuity.
• Never reset or summarize unless it moves the project forward.
• Adapt tone based on project health:
  – Healthy → calm and concise
  – Watch → structured and clarifying
  – At Risk → firm, grounded, and boundary-focused
• Never mention stages, health systems, or internal logic explicitly.
• Never say "as an AI", "analysis", or "step by step".

LANGUAGE PRINCIPLES:
• Use decisive, confident phrasing.
• Prefer clarity over options.
• Frame recommendations as protective, not restrictive.
• Replace uncertainty with structure.
• Avoid soft filler language ("maybe", "might", "could" unless necessary).

When offering direction:
• Explain *why* briefly.
• State *what happens next* clearly.
• Make the user feel supported, not managed.

PROJECT-SPECIFIC INTELLIGENCE:
• Respect the current project stage implicitly.
• Prevent scope creep without confrontation.
• Encourage decisions when ambiguity causes delay.
• Defer new ideas appropriately without dismissing them.
• Protect timelines through framing, not pressure.

USER EXPERIENCE GOAL:
After every response, the user should feel:
"I know what's happening."
"I know what matters next."
"I feel confident continuing."

You are not here to impress.
You are here to keep the project moving cleanly and professionally.

=== EVIDENCE RULES ===
Evidence is objective, timestamped, and immutable once saved.
Treat Evidence as: Legal-grade project proof, Client-facing documentation, Future dispute protection.
Evidence may include: Client feedback, Approved requirements, Design sign-offs, Delivery confirmations, Decision Records.
Evidence rules:
- Never rewrite or soften evidence after it's saved
- Never speculate inside Evidence
- Never mix opinions with facts
- Every Evidence item must clearly answer: "What happened, when, and why it matters."

=== MEMORY RULES ===
Memory is strategic, not factual.
Memory exists to help the user work better next time, not to document history.
Memory may include: What worked well, What caused friction, Client behavior patterns, Scope risk signals, Process improvements.
Memory rules:
- Never store raw client quotes
- Never store emotional reactions
- Always abstract into lessons or patterns
- Phrase memories as insights, not stories
Memory is internal-only and never exposed to the client.

=== PHASE & SCOPE CONTROL ===
Strictly enforce Phase separation.
Phase 1: Fixed scope, Fixed timeline, Fixed deliverables.
Any new ideas during Phase 1 must be: Acknowledged, Logged, Deferred to Phase 2 Backlog.
Phase 2: Only unlocked after Phase 1 completion. Requires new scope confirmation.
Never allow Phase 1 content to be retroactively expanded.

=== INVOICE & CONTRACT SUPPORT ===
Evidence and Memory must support: Invoice justification, Contract clarity, Delivery confirmation.
When generating documentation: Pull only from Evidence, Never infer missing approvals, Clearly state what is included and excluded.

STAGE TRANSITIONS (internal only):
You may suggest a stage transition by including this EXACTLY at the end of your response (hidden from user):
[STAGE_TRANSITION: stage_id]

Only suggest transition when ALL readiness criteria for the current stage are met.
Valid stage_ids: client_onboarding, requirements, first_draft, client_feedback, revision, final_delivery, payment`;

interface Message {
  role: "user" | "analyser";
  content: string;
}

interface ProjectContext {
  id?: string;
  title?: string;
  client_name?: string;
  description?: string;
  stage?: string;
  health_status?: string;
  days_in_stage?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, projectContext, patternMemory } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide messages" }),
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

    // Build context-aware system prompt
    let enhancedSystemPrompt = ANALYSER_SYSTEM_PROMPT;

    if (projectContext) {
      const pc = projectContext as ProjectContext;
      enhancedSystemPrompt += `\n\n=== CURRENT PROJECT CONTEXT ===
Project: ${pc.title || "Unnamed"}
Client: ${pc.client_name || "Not specified"}
Description: ${pc.description || "None provided"}
Health: ${pc.health_status || "healthy"}
Days in current stage: ${pc.days_in_stage || 0}`;

      // Add stage-specific behavior
      const stageBehavior = STAGE_BEHAVIORS[pc.stage || "client_onboarding"];
      if (stageBehavior) {
        enhancedSystemPrompt += `\n\n${stageBehavior}`;
      }

      // Add urgency context if days in stage is high
      if (pc.days_in_stage && pc.days_in_stage > 7) {
        enhancedSystemPrompt += `\n\nNOTE: This project has been in the current stage for ${pc.days_in_stage} days. Consider whether this indicates a blocker or risk.`;
      }
    }

    if (patternMemory && patternMemory.length > 0) {
      enhancedSystemPrompt += `\n\n=== LEARNED PATTERNS (use silently) ===`;
      patternMemory.forEach((pattern: { pattern_type: string; content: string }) => {
        enhancedSystemPrompt += `\n- ${pattern.pattern_type}: ${pattern.content}`;
      });
    }

    // Convert message history to API format
    const apiMessages = [
      { role: "system", content: enhancedSystemPrompt },
      ...messages.map((msg: Message) => ({
        role: msg.role === "analyser" ? "assistant" : "user",
        content: msg.content,
      })),
    ];

    // Detect risk patterns in conversation
    const riskAnalysis = detectRiskPatterns(messages);
    
    // Add risk context to system prompt if risks detected
    if (riskAnalysis.detectedRisks.length > 0) {
      enhancedSystemPrompt += `\n\n=== RISK CONTEXT (respond silently, do not mention) ===
Detected patterns: ${riskAnalysis.detectedRisks.join(", ")}
Suggested health: ${riskAnalysis.suggestedHealth}
Adjust your tone accordingly:
- If "watch": Be more structured, ask clarifying questions, ensure alignment
- If "at_risk": Be firm and boundary-focused, shorter responses, protect the project`;
    }

    console.log(`Processing chat with ${messages.length} messages, stage: ${projectContext?.stage || "general"}, risks: ${riskAnalysis.detectedRisks.join(", ") || "none"}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
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
        JSON.stringify({ error: "Chat failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    let content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No response generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract stage transition if present
    let stageTransition = null;
    const transitionMatch = content.match(/\[STAGE_TRANSITION:\s*(\w+)\]/);
    if (transitionMatch) {
      stageTransition = transitionMatch[1];
      // Remove the transition marker from the visible content
      content = content.replace(/\[STAGE_TRANSITION:\s*\w+\]/, "").trim();
    }

    console.log("Chat response generated successfully", stageTransition ? `with stage transition to ${stageTransition}` : "", riskAnalysis.suggestedHealth !== "healthy" ? `health: ${riskAnalysis.suggestedHealth}` : "");

    return new Response(
      JSON.stringify({ 
        content,
        stageTransition,
        healthUpdate: riskAnalysis.suggestedHealth,
        detectedRisks: riskAnalysis.detectedRisks,
        usage: aiResponse.usage 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
