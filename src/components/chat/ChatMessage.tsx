import { Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "analyser";
  content: string;
  timestamp?: string;
}

export default function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isAnalyser = role === "analyser";

  return (
    <div className={`flex gap-3 ${isAnalyser ? "" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isAnalyser
            ? "bg-gradient-to-br from-primary to-accent"
            : "bg-secondary"
        }`}
      >
        {isAnalyser ? (
          <Brain className="w-4 h-4 text-primary-foreground" />
        ) : (
          <span className="text-sm font-medium">U</span>
        )}
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isAnalyser
            ? "bg-card border border-border"
            : "bg-primary/10 border border-primary/20"
        }`}
      >
        <div className="prose prose-sm prose-invert max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="text-foreground/90 leading-relaxed mb-2 last:mb-0">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1 text-foreground/90 mb-2">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1 text-foreground/90 mb-2">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-foreground/90">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-foreground/80">{children}</em>
              ),
              h1: ({ children }) => (
                <h1 className="text-lg font-semibold text-foreground mt-4 mb-2">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-semibold text-foreground mt-3 mb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-foreground mt-2 mb-1">{children}</h3>
              ),
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 bg-secondary rounded text-sm font-mono">
                  {children}
                </code>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground">
                  {children}
                </blockquote>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        {timestamp && (
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}
