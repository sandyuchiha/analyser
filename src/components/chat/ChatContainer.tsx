import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ThreadList, { Thread } from "./ThreadList";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { Brain, PanelLeftClose, PanelLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "analyser";
  content: string;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  stage: string | null;
}

interface ChatContainerProps {
  projectId?: string;
  project?: Project | null;
}

export default function ChatContainer({ projectId, project }: ChatContainerProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch threads for this project (or all threads if no project)
  const fetchThreads = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    let query = supabase
      .from("conversation_threads")
      .select("id, title, status, updated_at")
      .eq("user_id", userData.user.id)
      .order("updated_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    } else {
      query = query.is("project_id", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching threads:", error);
      return;
    }

    const validThreads = (data || []).map(thread => ({
      ...thread,
      status: (thread.status as "active" | "paused" | "resolved") || "active"
    }));

    setThreads(validThreads);

    // Auto-select first thread or create new one if none exist
    if (validThreads.length > 0 && !activeThreadId) {
      setActiveThreadId(validThreads[0].id);
    }

    setLoading(false);
  }, [projectId, activeThreadId]);

  // Fetch messages for active thread
  const fetchMessages = useCallback(async () => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("thread_id", activeThreadId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    const validMessages = (data || []).map(msg => ({
      ...msg,
      role: msg.role as "user" | "analyser"
    }));

    setMessages(validMessages);
  }, [activeThreadId]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewThread = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from("conversation_threads")
      .insert({
        user_id: userData.user.id,
        project_id: projectId || null,
        title: "New Conversation",
        status: "active",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create conversation");
      return;
    }

    const newThread: Thread = {
      id: data.id,
      title: data.title,
      status: data.status as "active" | "paused" | "resolved",
      updated_at: data.updated_at,
    };

    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(data.id);
    setMessages([]);
  };

  const handleDeleteThread = async (threadId: string) => {
    const { error } = await supabase
      .from("conversation_threads")
      .delete()
      .eq("id", threadId);

    if (error) {
      toast.error("Failed to delete conversation");
      return;
    }

    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeThreadId === threadId) {
      const remaining = threads.filter((t) => t.id !== threadId);
      setActiveThreadId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleRenameThread = async (threadId: string, newTitle: string) => {
    const { error } = await supabase
      .from("conversation_threads")
      .update({ title: newTitle })
      .eq("id", threadId);

    if (error) {
      toast.error("Failed to rename conversation");
      return;
    }

    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, title: newTitle } : t))
    );
  };

  const handleSendMessage = async (content: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Create thread if none exists
    let threadId = activeThreadId;
    if (!threadId) {
      const { data: newThread, error: threadError } = await supabase
        .from("conversation_threads")
        .insert({
          user_id: userData.user.id,
          project_id: projectId || null,
          title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
          status: "active",
        })
        .select()
        .single();

      if (threadError) {
        toast.error("Failed to create conversation");
        return;
      }

      threadId = newThread.id;
      setActiveThreadId(threadId);
      setThreads((prev) => [
        {
          id: newThread.id,
          title: newThread.title,
          status: newThread.status as "active" | "paused" | "resolved",
          updated_at: newThread.updated_at,
        },
        ...prev,
      ]);
    }

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

      // Call chat edge function
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
            projectContext: project
              ? {
                  title: project.title,
                  description: project.description,
                  stage: project.stage,
                }
              : null,
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

      // Update thread title if it's the first message
      if (messages.length === 0) {
        await supabase
          .from("conversation_threads")
          .update({ title: content.slice(0, 50) + (content.length > 50 ? "..." : "") })
          .eq("id", threadId);

        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId
              ? { ...t, title: content.slice(0, 50) + (content.length > 50 ? "..." : "") }
              : t
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get response");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background rounded-xl border border-border overflow-hidden">
      {/* Thread sidebar */}
      <div
        className={`border-r border-border bg-card transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0"
        } overflow-hidden`}
      >
        <ThreadList
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={setActiveThreadId}
          onNewThread={handleNewThread}
          onDeleteThread={handleDeleteThread}
          onRenameThread={handleRenameThread}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-card/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeft className="w-5 h-5" />
            )}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">ANALYSER</h2>
              <p className="text-xs text-muted-foreground">
                {project ? project.title : "General Conversation"}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Describe your situation, challenge, or decision. I'll help you think through it clearly and calmly.
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
          placeholder="Describe your situation..."
        />
      </div>
    </div>
  );
}
