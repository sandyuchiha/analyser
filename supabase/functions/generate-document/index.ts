import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type DocumentType = "project_summary" | "invoice" | "contract";

interface GenerateRequest {
  projectId: string;
  documentType: DocumentType;
}

const DOCUMENT_PROMPTS: Record<DocumentType, string> = {
  project_summary: `Generate a Project Memory PDF document. Include these sections:

1. **Project Overview** — Project name, client name, start date, current stage and status.
2. **Phase Scope Summary** — Phase 1 scope with explicit inclusions and exclusions/deferrals.
3. **Key Decisions & Approvals** — Chronological list with dates and evidence references.
4. **Requirements & Constraints** — Finalized requirements, technical/creative constraints, timeline boundaries.
5. **Tools & Platforms Used** — Design tools, dev platforms, hosting/CMS decisions (if mentioned in evidence).
6. **References & Assets** — Links, files, inspirations (if any in evidence).
7. **Risks & Mitigations** — Identified risks and how they were handled.
8. **Current Status Summary** — What is complete, in progress, and pending.

Formatting: Clear headings, professional tone, suitable for client sharing. No AI language. No speculation.`,

  invoice: `Generate a professional invoice document. Rules:
- Line items MUST come from approved scope items and completed stages only.
- Each line item must reference an Evidence ID and completion date.
- Do NOT include unapproved features or Phase 2 backlog items.
- Clearly state what was delivered, under which phase, and payment terms.
- If evidence is insufficient to justify a line item, flag it as "EVIDENCE INSUFFICIENT — cannot invoice".

Include sections:
1. **Invoice Header** — Project name, client, invoice date, invoice number (draft).
2. **Line Items** — Description, evidence reference, completion date, amount (placeholder).
3. **Summary** — Total, payment terms, phase reference.
4. **Notes** — Any conditions or follow-up items.`,

  contract: `Generate a professional contract document assembled from validated project evidence. Include these clauses:

1. **Scope Clause** — From Scope Definition evidence. Explicit inclusion + exclusion list.
2. **Timeline Clause** — Derived from stage transitions. Includes agreed dates.
3. **Change Management Clause** — Auto-insert if Phase 2 backlog exists: "Additional features are handled as a separate phase and do not impact the agreed timeline."
4. **Payment Clause** — Mirrors invoice logic. Tied to completed milestones.
5. **Approval Clause** — References approval evidence. States that approvals lock the scope.
6. **Dispute Protection Clause** — States that decisions are based on documented evidence and approvals.

Contract must match project reality and never contradict stored evidence.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { projectId, documentType } = (await req.json()) as GenerateRequest;

    if (!projectId || !documentType || !DOCUMENT_PROMPTS[documentType]) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project
    const { data: project, error: projError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all evidence for this project
    const { data: evidence } = await supabase
      .from("evidence")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    // Validation for invoices
    if (documentType === "invoice") {
      const hasScope = evidence?.some((e) => e.evidence_type === "scope_definition");
      const hasApproval = evidence?.some((e) => e.evidence_type === "approval");
      if (!hasScope || !hasApproval) {
        return new Response(
          JSON.stringify({
            error: "Cannot generate invoice",
            reason: !hasScope
              ? "No Scope Definition evidence found. Add a scope definition first."
              : "No Approval evidence found. At least one approval is required.",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validation for contracts
    if (documentType === "contract") {
      const hasScope = evidence?.some((e) => e.evidence_type === "scope_definition");
      if (!hasScope) {
        return new Response(
          JSON.stringify({
            error: "Cannot generate contract",
            reason: "No Scope Definition evidence found. Add a scope definition first.",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build evidence context
    const evidenceContext = (evidence || [])
      .map(
        (e) =>
          `[${e.evidence_type.toUpperCase()}] (ID: ${e.id.slice(0, 8)}) ${e.title}\nDate: ${e.created_at}\n${e.content || "No details."}`
      )
      .join("\n\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are ANALYSER, a professional document generator.
You produce clean, client-ready documents from real project evidence.
Never invent facts. Use only the evidence provided.
Language must be neutral, professional, and suitable for legal and business documents.
Never say "as an AI". Never speculate. If evidence is missing, state "Not documented".
Output in clean Markdown format.`;

    const userPrompt = `${DOCUMENT_PROMPTS[documentType]}

=== PROJECT ===
Name: ${project.title}
Client: ${project.client_name || "Not specified"}
Description: ${project.description || "None"}
Stage: ${project.stage || "client_onboarding"}
Health: ${project.health_status}
Created: ${project.created_at}

=== EVIDENCE (${(evidence || []).length} entries) ===
${evidenceContext || "No evidence recorded yet."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Document generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "No document generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generated ${documentType} for project ${project.title}`);

    return new Response(
      JSON.stringify({ content, documentType, projectTitle: project.title }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
