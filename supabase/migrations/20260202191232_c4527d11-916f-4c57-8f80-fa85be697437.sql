-- Create conversation threads table
CREATE TABLE public.conversation_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'analyser')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pattern memory table for learned patterns
CREATE TABLE public.pattern_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence_score NUMERIC(3,2) DEFAULT 0.5,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_memory ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversation_threads
CREATE POLICY "Users can view their own threads"
ON public.conversation_threads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own threads"
ON public.conversation_threads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads"
ON public.conversation_threads FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads"
ON public.conversation_threads FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for messages
CREATE POLICY "Users can view messages in their threads"
ON public.messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create messages in their threads"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.messages FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for pattern_memory
CREATE POLICY "Users can view their own patterns"
ON public.pattern_memory FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patterns"
ON public.pattern_memory FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns"
ON public.pattern_memory FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patterns"
ON public.pattern_memory FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at on conversation_threads
CREATE TRIGGER update_conversation_threads_updated_at
BEFORE UPDATE ON public.conversation_threads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_threads_project_id ON public.conversation_threads(project_id);
CREATE INDEX idx_threads_user_id ON public.conversation_threads(user_id);
CREATE INDEX idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX idx_pattern_memory_user_project ON public.pattern_memory(user_id, project_id);