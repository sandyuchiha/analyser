import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProjectHeader, { Project } from "./ProjectHeader";
import StageFlow from "./StageFlow";
import StageInfoPanel from "./StageInfoPanel";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";

interface ProjectWorkspaceProps {
  projectId: string;
  onBack: () => void;
}

interface Message {
  id: string;
  role: "user" | "analyser";
  content: string;
  created_at: string;
}

export default function ProjectWorkspace({ projectId, onBack }: ProjectWorkspaceProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [stageInfoOpen, setStageInfoOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch project details
  const fetchProject = useCallback(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error) {
      console.error("Error fetching project:", error);
      toast.error("Failed to load project");
      return;
    }

    setProject(data as Project);
  }, [projectId]);

  // Fetch or create the single conversation thread for this project
  const fetchOrCreateThread = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Get existing thread for this project
    const { data: existingThreads, error: threadError } = await supabase
      .from("conversation_threads")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (threadError) {
      console.error("Error fetching thread:", threadError);
      return;
    }

    if (existingThreads && existingThreads.length > 0) {
      setThreadId(existingThreads[0].id);
      return existingThreads[0].id;
    }

    // Create new thread for this project
    const { data: newThread, error: createError } = await supabase
      .from("conversation_threads")
      .insert({
        user_id: userData.user.id,
        project_id: projectId,
        title: "Project Conversation",
        status: "active",
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating thread:", createError);
      return;
    }

    setThreadId(newThread.id);
    return newThread.id;
  }, [projectId]);

  // Fetch messages for the thread
  const fetchMessages = useCallback(async () => {
    if (!threadId) return;

    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    setMessages(
      (data || []).map((msg) => ({
        ...msg,
        role: msg.role as "user" | "analyser",
      }))
    );
  }, [threadId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchProject();
      await fetchOrCreateThread();
      setLoading(false);
    };
    init();
  }, [fetchProject, fetchOrCreateThread]);

  useEffect(() => {
    if (threadId) {
      fetchMessages();
    }
  }, [threadId, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !threadId || !project) return;

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        user_id: userData.user.id,
        role: "user",
        content,
      })
      .select()
      .single();

    if (userMsgError) {
      toast.error("Failed to send message");
      return;
    }

    const newUserMsg: Message = {
      id: userMessage.id,
      role: "user",
      content: userMessage.content,
      created_at: userMessage.created_at,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setSending(true);

    try {
      // Fetch pattern memory for context
      const { data: patternMemory } = await supabase
        .from("pattern_memory")
        .select("pattern_type, content")
        .eq("user_id", userData.user.id)
        .order("last_seen_at", { ascending: false })
        .limit(5);

      // Build message history for AI
      const messageHistory = [...messages, newUserMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Call chat edge function with full project context
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: messageHistory,
            projectContext: {
              id: project.id,
              title: project.title,
              client_name: project.client_name,
              description: project.description,
              stage: project.stage,
              health_status: project.health_status,
              days_in_stage: project.days_in_stage,
            },
            patternMemory: patternMemory || [],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Chat failed");
      }

      const data = await response.json();

      // Save AI response
      const { data: aiMessage, error: aiMsgError } = await supabase
        .from("messages")
        .insert({
          thread_id: threadId,
          user_id: userData.user.id,
          role: "analyser",
          content: data.content,
        })
        .select()
        .single();

      if (aiMsgError) {
        console.error("Failed to save AI message:", aiMsgError);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: aiMessage?.id || crypto.randomUUID(),
          role: "analyser",
          content: data.content,
          created_at: aiMessage?.created_at || new Date().toISOString(),
        },
      ]);

      // Check if stage transition was suggested
      if (data.stageTransition && data.stageTransition !== project.stage) {
        // Update project stage
        await supabase
          .from("projects")
          .update({
            stage: data.stageTransition,
            stage_started_at: new Date().toISOString(),
            days_in_stage: 0,
          })
          .eq("id", projectId);

        // Refresh project data
        await fetchProject();
      }

      // Update health status if changed
      if (data.healthUpdate && data.healthUpdate !== project.health_status) {
        await supabase
          .from("projects")
          .update({
            health_status: data.healthUpdate,
          })
          .eq("id", projectId);

        // Refresh project data
        await fetchProject();
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get response");
    } finally {
      setSending(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-6xl">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="self-start mb-4 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        All Projects
      </Button>

      {/* Project Header */}
      <div className="mb-6">
        <ProjectHeader project={project} />
      </div>

      {/* Stage Flow */}
      <div className="mb-6">
        <StageFlow
          currentStage={project.stage || "client_onboarding"}
          onStageClick={() => setStageInfoOpen(true)}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background rounded-xl border border-border overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Describe what's happening</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                This conversation continues as long as the project exists. I'll remember everything and help you navigate each stage.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.created_at}
              />
            ))
          )}
          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-card border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={sending}
          loading={sending}
          placeholder="Describe what's happening..."
        />
      </div>

      {/* Stage Info Panel */}
      <StageInfoPanel
        stage={project.stage || "client_onboarding"}
        isOpen={stageInfoOpen}
        onClose={() => setStageInfoOpen(false)}
      />
    </div>
  );
}
