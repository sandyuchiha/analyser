import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Project {
  id: string;
  title: string;
  client_name: string | null;
  description: string | null;
  status: string;
  stage: string | null;
  health_status: string;
  days_in_stage: number;
  stage_started_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectHeaderProps {
  project: Project;
}

const STAGE_LABELS: Record<string, string> = {
  client_onboarding: "Client Onboarding",
  requirements: "Requirements",
  first_draft: "First Draft",
  client_feedback: "Client Feedback",
  revision: "Revision",
  final_delivery: "Final Delivery",
  payment: "Payment",
};

const STAGE_STATE_TEXT: Record<string, string> = {
  client_onboarding: "Getting to know the client and their needs",
  requirements: "Defining scope and deliverables",
  first_draft: "Creating the initial version",
  client_feedback: "Waiting for client response",
  revision: "Incorporating feedback",
  final_delivery: "Preparing final handoff",
  payment: "Awaiting payment confirmation",
};

const HEALTH_CONFIG: Record<string, { label: string; className: string }> = {
  healthy: {
    label: "Healthy",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  watch: {
    label: "Watch",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  risk: {
    label: "Risk",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export default function ProjectHeader({ project }: ProjectHeaderProps) {
  const stageLabel = STAGE_LABELS[project.stage || "client_onboarding"];
  const stateText = STAGE_STATE_TEXT[project.stage || "client_onboarding"];
  const healthConfig = HEALTH_CONFIG[project.health_status] || HEALTH_CONFIG.healthy;

  const showDaysWarning = project.days_in_stage > 7;

  return (
    <div className="space-y-4">
      {/* Top row: Name + Client */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          {project.client_name && (
            <p className="text-muted-foreground">{project.client_name}</p>
          )}
        </div>
        <Badge
          variant="outline"
          className={cn("px-3 py-1 text-xs font-medium", healthConfig.className)}
        >
          {healthConfig.label}
        </Badge>
      </div>

      {/* Stage + State */}
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium">
          {stageLabel}
        </div>
        <p className="text-muted-foreground text-sm">{stateText}</p>
      </div>

      {/* Days in stage - only if abnormal */}
      {showDaysWarning && (
        <p className="text-sm text-amber-400">
          {project.days_in_stage} days in this stage
        </p>
      )}
    </div>
  );
}
