import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText,
  Receipt,
  ScrollText,
  Loader2,
  Download,
  AlertCircle,
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
import ReactMarkdown from "react-markdown";

interface Project {
  id: string;
  title: string;
  client_name: string | null;
  stage: string | null;
}

type DocumentType = "project_summary" | "invoice" | "contract";

const DOCUMENT_TYPES: {
  id: DocumentType;
  label: string;
  description: string;
  icon: typeof FileText;
}[] = [
  {
    id: "project_summary",
    label: "Project Summary",
    description: "Full project memory PDF with scope, decisions, risks, and status.",
    icon: FileText,
  },
  {
    id: "invoice",
    label: "Invoice",
    description: "Invoice derived from approved scope and completed milestones.",
    icon: Receipt,
  },
  {
    id: "contract",
    label: "Contract",
    description: "Contract assembled from validated evidence and clause mapping.",
    icon: ScrollText,
  },
];

export default function DocumentsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<{
    content: string;
    type: DocumentType;
    projectTitle: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data } = await supabase
        .from("projects")
        .select("id, title, client_name, stage")
        .eq("user_id", userData.user.id)
        .order("updated_at", { ascending: false });

      setProjects((data as Project[]) || []);
      setLoading(false);
    };
    fetchProjects();
  }, []);

  const handleGenerate = async (docType: DocumentType) => {
    if (!selectedProject) {
      toast.error("Select a project first");
      return;
    }

    setGenerating(true);
    setGeneratedDoc(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            projectId: selectedProject,
            documentType: docType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.reason || data.error || "Generation failed");
        return;
      }

      setGeneratedDoc({
        content: data.content,
        type: docType,
        projectTitle: data.projectTitle,
      });
      toast.success("Document generated");
    } catch (err) {
      console.error("Generate error:", err);
      toast.error("Failed to generate document");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Documents</h1>
        <p className="text-muted-foreground">
          Generate professional documents from your project evidence — summaries, invoices, and contracts.
        </p>
      </div>

      {/* Project Selector */}
      <div className="mb-8">
        <label className="text-sm font-medium mb-2 block">Select Project</label>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="Choose a project..." />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title} {p.client_name ? `— ${p.client_name}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document Types Grid */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {DOCUMENT_TYPES.map((doc) => {
          const Icon = doc.icon;
          return (
            <div
              key={doc.id}
              className="bg-card border border-border rounded-xl p-5 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-medium">{doc.label}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 flex-1">
                {doc.description}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleGenerate(doc.id)}
                disabled={generating || !selectedProject}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Generate
              </Button>
            </div>
          );
        })}
      </div>

      {/* Generated Document Output */}
      {generatedDoc && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {DOCUMENT_TYPES.find((d) => d.id === generatedDoc.type)?.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {generatedDoc.projectTitle}
              </span>
            </div>
          </div>
          <div className="p-6 prose prose-sm prose-invert max-w-none">
            <ReactMarkdown>{generatedDoc.content}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!generatedDoc && !generating && (
        <div className="card-glow text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-medium mb-2">No document generated yet</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Select a project and choose a document type. Documents are generated from your stored evidence.
          </p>
        </div>
      )}
    </div>
  );
}
