import { useState } from "react";
import { Plus, MessageSquare, MoreHorizontal, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Thread {
  id: string;
  title: string;
  status: "active" | "paused" | "resolved";
  updated_at: string;
}

interface ThreadListProps {
  threads: Thread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newTitle: string) => void;
}

export default function ThreadList({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onRenameThread,
}: ThreadListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const startEditing = (thread: Thread) => {
    setEditingId(thread.id);
    setEditTitle(thread.title);
  };

  const saveEdit = () => {
    if (editingId && editTitle.trim()) {
      onRenameThread(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <Button variant="secondary" size="sm" className="w-full justify-start" onClick={onNewThread}>
          <Plus className="w-4 h-4 mr-2" />
          New Conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {threads.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          </div>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              className={`group flex items-center gap-2 rounded-lg transition-colors ${
                activeThreadId === thread.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {editingId === thread.id ? (
                <div className="flex-1 flex items-center gap-1 p-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="flex-1 bg-transparent border-b border-primary focus:outline-none text-sm"
                    autoFocus
                  />
                  <button onClick={saveEdit} className="p-1 hover:text-primary">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={cancelEdit} className="p-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onSelectThread(thread.id)}
                    className="flex-1 flex items-center gap-2 p-2 text-left"
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="text-sm truncate">{thread.title}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={() => startEditing(thread)}>
                        <Pencil className="w-3 h-3 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteThread(thread.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
