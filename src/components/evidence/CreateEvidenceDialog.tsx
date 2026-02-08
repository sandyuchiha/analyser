import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  title: string;
}

interface CreateEvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onSuccess: () => void;
}

const EVIDENCE_TYPES = [
  { value: "decision_record", label: "Decision Record" },
  { value: "requirement", label: "Requirement" },
  { value: "approval", label: "Approval" },
  { value: "scope_definition", label: "Scope Definition" },
  { value: "note", label: "Note" },
  { value: "reference", label: "Reference" },
];

export default function CreateEvidenceDialog({
  open,
  onOpenChange,
  projects,
  onSuccess,
}: CreateEvidenceDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [evidenceType, setEvidenceType] = useState("note");
  const [projectId, setProjectId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("You must be logged in");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("evidence").insert({
      user_id: userData.user.id,
      title: title.trim(),
      content: content.trim() || null,
      evidence_type: evidenceType,
      project_id: projectId && projectId !== "none" ? projectId : null,
    });

    setSaving(false);

    if (error) {
      console.error("Error creating evidence:", error);
      toast.error("Failed to create evidence");
      return;
    }

    toast.success("Evidence recorded");
    
    // Reset form
    setTitle("");
    setContent("");
    setEvidenceType("note");
    setProjectId("");
    
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Evidence</DialogTitle>
          <DialogDescription>
            Record an objective, timestamped entry for project documentation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Client approved homepage design"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={evidenceType} onValueChange={setEvidenceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
              <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Details</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What happened, when, and why it matters..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Write in neutral, professional language suitable for client-facing documents.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Evidence
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
