import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StageInfoPanelProps {
  stage: string;
  isOpen: boolean;
  onClose: () => void;
}

interface StageInfo {
  title: string;
  meaning: string;
  doneWhen: string[];
  watching: string[];
}

const STAGE_INFO: Record<string, StageInfo> = {
  client_onboarding: {
    title: "Client Onboarding",
    meaning: "This is where we establish the foundation. Understanding who the client is, what they need, and setting expectations for the engagement.",
    doneWhen: [
      "Client goals are clearly understood",
      "Communication preferences are established",
      "Basic project parameters are identified",
    ],
    watching: [
      "Unclear expectations or shifting goals",
      "Communication gaps or delays",
      "Scope ambiguity",
    ],
  },
  requirements: {
    title: "Requirements",
    meaning: "Defining exactly what will be delivered. This stage locks in scope, timeline, and deliverables before work begins.",
    doneWhen: [
      "Scope is documented and agreed upon",
      "Deliverables are clearly defined",
      "Timeline expectations are set",
    ],
    watching: [
      "Feature creep before work starts",
      "Contradictory requirements",
      "Missing stakeholder input",
    ],
  },
  first_draft: {
    title: "First Draft",
    meaning: "Creating the initial version of the deliverable. Focus is on execution, not perfection.",
    doneWhen: [
      "First version is complete",
      "Core requirements are addressed",
      "Ready for client review",
    ],
    watching: [
      "Perfectionism delaying delivery",
      "Scope drift during creation",
      "Blocked dependencies",
    ],
  },
  client_feedback: {
    title: "Client Feedback",
    meaning: "Waiting for and processing client response. This stage can reveal alignment issues or unspoken expectations.",
    doneWhen: [
      "Client has reviewed the draft",
      "Feedback is documented",
      "Next steps are clear",
    ],
    watching: [
      "Delayed responses",
      "Vague or contradictory feedback",
      "New stakeholders appearing",
      "Emotional reactions vs. actionable feedback",
    ],
  },
  revision: {
    title: "Revision",
    meaning: "Incorporating feedback while protecting project boundaries. The goal is refinement, not rebuilding.",
    doneWhen: [
      "Agreed changes are implemented",
      "Client confirms satisfaction",
      "No new major feedback",
    ],
    watching: [
      "Scope creep disguised as feedback",
      "Endless revision cycles",
      "Moving goalposts",
    ],
  },
  final_delivery: {
    title: "Final Delivery",
    meaning: "Packaging and handing off the completed work. Clear documentation and confirmation are essential.",
    doneWhen: [
      "All deliverables are provided",
      "Client confirms receipt",
      "Handoff documentation complete",
    ],
    watching: [
      "Last-minute change requests",
      "Missing acceptance confirmation",
      "Unclear ownership transfer",
    ],
  },
  payment: {
    title: "Payment",
    meaning: "The project is complete. This stage focuses on closing the financial aspect professionally.",
    doneWhen: [
      "Invoice sent or payment received",
      "Payment confirmed",
      "Project formally closed",
    ],
    watching: [
      "Payment delays",
      "Dispute signals",
      "Scope claims after delivery",
    ],
  },
};

export default function StageInfoPanel({ stage, isOpen, onClose }: StageInfoPanelProps) {
  const info = STAGE_INFO[stage] || STAGE_INFO.client_onboarding;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-lg z-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Current Stage
            </p>
            <h2 className="text-xl font-semibold">{info.title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-primary mb-2">What this stage means</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{info.meaning}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-emerald-400 mb-2">Done when</h3>
            <ul className="space-y-2">
              {info.doneWhen.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-amber-400 mb-2">What we're watching</h3>
            <ul className="space-y-2">
              {info.watching.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Stage transitions happen automatically based on conversation signals. There are no manual controls.
          </p>
        </div>
      </div>
    </div>
  );
}
