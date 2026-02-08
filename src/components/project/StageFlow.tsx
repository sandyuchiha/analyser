import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StageFlowProps {
  currentStage: string;
  onStageClick: (stage: string) => void;
}

const STAGES = [
  { id: "client_onboarding", label: "Client Onboarding" },
  { id: "requirements", label: "Requirements" },
  { id: "first_draft", label: "First Draft" },
  { id: "client_feedback", label: "Client Feedback" },
  { id: "revision", label: "Revision" },
  { id: "final_delivery", label: "Final Delivery" },
  { id: "payment", label: "Payment" },
];

export default function StageFlow({ currentStage, onStageClick }: StageFlowProps) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {STAGES.map((stage, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={stage.id} className="flex items-center">
            <button
              onClick={() => isCurrent && onStageClick(stage.id)}
              disabled={!isCurrent}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                isPast && "bg-secondary/50 text-muted-foreground cursor-default",
                isCurrent && "bg-primary/10 text-primary ring-1 ring-primary/30 hover:bg-primary/15 cursor-pointer",
                isFuture && "bg-secondary/30 text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              {isPast && (
                <Check className="w-4 h-4 text-emerald-500" />
              )}
              {stage.label}
            </button>
            {index < STAGES.length - 1 && (
              <div
                className={cn(
                  "w-8 h-px mx-1",
                  index < currentIndex ? "bg-emerald-500/50" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
