import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Loader2, TrendingUp, AlertTriangle, MessageSquare, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface PatternMemory {
  id: string;
  pattern_type: string;
  content: string;
  confidence_score: number | null;
  last_seen_at: string;
  created_at: string;
  project_id: string | null;
}

const PATTERN_TYPE_CONFIG: Record<string, { label: string; icon: typeof TrendingUp; className: string }> = {
  scope_creep: { label: "Scope Creep", icon: AlertTriangle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  payment_risk: { label: "Payment Risk", icon: AlertTriangle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  communication_friction: { label: "Communication", icon: MessageSquare, className: "bg-primary/10 text-primary border-primary/20" },
  timeline_delay: { label: "Timeline", icon: Clock, className: "bg-accent/10 text-accent border-accent/20" },
  positive_outcome: { label: "What Worked", icon: TrendingUp, className: "bg-accent/10 text-accent border-accent/20" },
};

function getPatternConfig(type: string) {
  return PATTERN_TYPE_CONFIG[type] || { label: type.replace(/_/g, " "), icon: BookOpen, className: "bg-muted text-muted-foreground border-border" };
}

export default function MemoryList() {
  const [patterns, setPatterns] = useState<PatternMemory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatterns = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("pattern_memory")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("last_seen_at", { ascending: false });

      if (!error && data) {
        setPatterns(data as PatternMemory[]);
      }
      setLoading(false);
    };

    fetchPatterns();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Memory & Learning</h1>
        <p className="text-muted-foreground">
          Patterns abstracted from your projects. Used silently to improve future guidance.
        </p>
      </div>

      {patterns.length === 0 ? (
        <div className="card-glow text-center py-16">
          <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-medium mb-2">Building your memory</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            As you analyze situations and complete projects, patterns will be captured here — scope risks, communication signals, what worked, what didn't.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {patterns.map((pattern) => {
            const config = getPatternConfig(pattern.pattern_type);
            const Icon = config.icon;
            return (
              <div key={pattern.id} className="card-glow flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className={config.className}>
                      {config.label}
                    </Badge>
                    {pattern.confidence_score !== null && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(pattern.confidence_score * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{pattern.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Last seen {formatDistanceToNow(new Date(pattern.last_seen_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
