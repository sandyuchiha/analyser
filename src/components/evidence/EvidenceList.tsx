import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, 
  CheckCircle, 
  ClipboardList, 
  Target, 
  StickyNote, 
  Link2,
  Plus,
  Calendar,
  Loader2,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateEvidenceDialog from "./CreateEvidenceDialog";
import EvidenceCard from "./EvidenceCard";

interface Evidence {
  id: string;
  title: string;
  content: string | null;
  evidence_type: string;
  file_url: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  title: string;
}

const EVIDENCE_TYPES = {
  decision_record: { label: "Decision Record", icon: CheckCircle, color: "text-green-500" },
  requirement: { label: "Requirement", icon: ClipboardList, color: "text-blue-500" },
  approval: { label: "Approval", icon: CheckCircle, color: "text-emerald-500" },
  scope_definition: { label: "Scope Definition", icon: Target, color: "text-purple-500" },
  note: { label: "Note", icon: StickyNote, color: "text-yellow-500" },
  reference: { label: "Reference", icon: Link2, color: "text-gray-500" },
};

export default function EvidenceList() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");

  const fetchEvidence = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    let query = supabase
      .from("evidence")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (filterType !== "all") {
      query = query.eq("evidence_type", filterType);
    }

    if (filterProject !== "all") {
      query = query.eq("project_id", filterProject);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching evidence:", error);
      toast.error("Failed to load evidence");
      return;
    }

    setEvidence(data || []);
  };

  const fetchProjects = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from("projects")
      .select("id, title")
      .eq("user_id", userData.user.id)
      .order("title", { ascending: true });

    if (error) {
      console.error("Error fetching projects:", error);
      return;
    }

    setProjects(data || []);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchEvidence(), fetchProjects()]);
      setLoading(false);
    };
    init();
  }, [filterType, filterProject]);

  const handleEvidenceCreated = () => {
    setDialogOpen(false);
    fetchEvidence();
  };

  const handleDeleteEvidence = async (id: string) => {
    const { error } = await supabase.from("evidence").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete evidence");
      return;
    }

    toast.success("Evidence deleted");
    fetchEvidence();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Evidence Storage</h1>
          <p className="text-muted-foreground">
            Objective, timestamped records for client-facing documentation.
          </p>
        </div>
        <Button variant="hero" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Evidence
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(EVIDENCE_TYPES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Evidence Grid */}
      {evidence.length === 0 ? (
        <div className="card-glow text-center py-16">
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-medium mb-2">No evidence stored</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Add decisions, approvals, requirements, and other project records.
          </p>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Evidence
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {evidence.map((item) => (
            <EvidenceCard
              key={item.id}
              evidence={item}
              projects={projects}
              onDelete={handleDeleteEvidence}
            />
          ))}
        </div>
      )}

      <CreateEvidenceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={projects}
        onSuccess={handleEvidenceCreated}
      />
    </div>
  );
}

export { EVIDENCE_TYPES };
