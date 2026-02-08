import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FolderOpen, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import CreateProjectDialog from "./CreateProjectDialog";

interface Project {
  id: string;
  title: string;
  client_name: string | null;
  status: string;
  stage: string | null;
  health_status: string;
  days_in_stage: number;
  updated_at: string;
}

interface ProjectListProps {
  onSelectProject: (projectId: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  client_onboarding: "Onboarding",
  requirements: "Requirements",
  first_draft: "First Draft",
  client_feedback: "Feedback",
  revision: "Revision",
  final_delivery: "Delivery",
  payment: "Payment",
};

const HEALTH_CONFIG: Record<string, { className: string }> = {
  healthy: { className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  watch: { className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  risk: { className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function ProjectList({ onSelectProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from("projects")
      .select("id, title, client_name, status, stage, health_status, days_in_stage, updated_at")
      .eq("user_id", userData.user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
      return;
    }

    setProjects(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    setDialogOpen(false);
    onSelectProject(newProject.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Projects</h1>
          <p className="text-muted-foreground">
            Each project has one continuous conversation that never resets.
          </p>
        </div>
        <Button variant="hero" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="card-glow text-center py-16">
          <FolderOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-medium mb-2">No projects yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Create your first project to start tracking a situation.
          </p>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const healthConfig = HEALTH_CONFIG[project.health_status] || HEALTH_CONFIG.healthy;
            const stageLabel = STAGE_LABELS[project.stage || "client_onboarding"];

            return (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="w-full card-glow text-left flex items-center gap-4 hover:border-primary/30 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium truncate">{project.title}</h3>
                    <Badge
                      variant="outline"
                      className={cn("text-xs shrink-0", healthConfig.className)}
                    >
                      {project.health_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {project.client_name && (
                      <span>{project.client_name}</span>
                    )}
                    <span className="text-primary">{stageLabel}</span>
                    {project.days_in_stage > 7 && (
                      <span className="text-amber-400">{project.days_in_stage}d</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            );
          })}
        </div>
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
