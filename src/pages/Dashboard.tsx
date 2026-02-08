import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { 
  Brain, 
  FolderOpen, 
  FileText, 
  ScrollText,
  LogOut, 
  Loader2,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ChatContainer from "@/components/chat/ChatContainer";
import ProjectList from "@/components/project/ProjectList";
import ProjectWorkspace from "@/components/project/ProjectWorkspace";
import EvidenceList from "@/components/evidence/EvidenceList";
import DocumentsList from "@/components/documents/DocumentsList";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<"chat" | "projects" | "evidence" | "documents">("chat");
  
  // Project workspace state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (!session) {
          navigate("/auth?mode=signin");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth?mode=signin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  // Reset selected project when switching tabs
  const handleTabChange = (tab: "chat" | "projects" | "evidence" | "documents") => {
    setActiveTab(tab);
    if (tab !== "projects") {
      setSelectedProjectId(null);
    }
  };

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs = [
    { id: "chat" as const, label: "Chat", icon: MessageSquare },
    { id: "projects" as const, label: "Projects", icon: FolderOpen },
    { id: "evidence" as const, label: "Evidence", icon: FileText },
    { id: "documents" as const, label: "Documents", icon: ScrollText },
  ];

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">ANALYSER</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-sm font-medium">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        <div className="p-8">
          {activeTab === "chat" && (
            <div className="max-w-6xl">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold mb-2">Conversation</h1>
                <p className="text-muted-foreground">
                  Describe your situation. ANALYSER will help you think through it clearly.
                </p>
              </div>
              <ChatContainer />
            </div>
          )}

          {activeTab === "projects" && (
            <>
              {selectedProjectId ? (
                <ProjectWorkspace
                  projectId={selectedProjectId}
                  onBack={() => setSelectedProjectId(null)}
                />
              ) : (
                <ProjectList onSelectProject={setSelectedProjectId} />
              )}
            </>
          )}

          {activeTab === "evidence" && <EvidenceList />}

          {activeTab === "documents" && <DocumentsList />}
        </div>
      </main>
    </div>
  );
}
