import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (project: any) => void;
}

export default function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Project title is required");
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("You must be logged in");
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: userData.user.id,
          title: title.trim(),
          client_name: clientName.trim() || null,
          description: description.trim() || null,
          status: "active",
          stage: "client_onboarding",
          health_status: "healthy",
          days_in_stage: 0,
          stage_started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success("Project created");
      onProjectCreated(data);
      
      // Reset form
      setTitle("");
      setClientName("");
      setDescription("");
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Create a project to track a client engagement or situation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Name</label>
            <Input
              placeholder="e.g., Website Redesign"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-analyser"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Client Name</label>
            <Input
              placeholder="e.g., Acme Corp"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="input-analyser"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              placeholder="Brief context about this project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-analyser resize-none h-24"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
