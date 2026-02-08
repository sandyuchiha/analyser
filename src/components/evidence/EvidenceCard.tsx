import { format } from "date-fns";
import { 
  FileText, 
  CheckCircle, 
  ClipboardList, 
  Target, 
  StickyNote, 
  Link2,
  Calendar,
  FolderOpen,
  Trash2,
  MoreVertical
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

interface EvidenceCardProps {
  evidence: Evidence;
  projects: Project[];
  onDelete: (id: string) => void;
}

const EVIDENCE_TYPES: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  decision_record: { label: "Decision Record", icon: CheckCircle, color: "text-green-500" },
  requirement: { label: "Requirement", icon: ClipboardList, color: "text-blue-500" },
  approval: { label: "Approval", icon: CheckCircle, color: "text-emerald-500" },
  scope_definition: { label: "Scope Definition", icon: Target, color: "text-purple-500" },
  note: { label: "Note", icon: StickyNote, color: "text-yellow-500" },
  reference: { label: "Reference", icon: Link2, color: "text-muted-foreground" },
};

export default function EvidenceCard({ evidence, projects, onDelete }: EvidenceCardProps) {
  const typeConfig = EVIDENCE_TYPES[evidence.evidence_type] || EVIDENCE_TYPES.note;
  const Icon = typeConfig.icon;
  const projectName = projects.find((p) => p.id === evidence.project_id)?.title;

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className={`p-2 rounded-lg bg-secondary/50 ${typeConfig.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{evidence.title}</h3>
              <Badge variant="secondary" className="text-xs shrink-0">
                {typeConfig.label}
              </Badge>
            </div>
            
            {evidence.content && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {evidence.content}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(evidence.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
              
              {projectName && (
                <div className="flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  <span>{projectName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Evidence</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this evidence record. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(evidence.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
