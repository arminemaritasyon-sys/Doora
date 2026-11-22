ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS hidden_by text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS direct_messages_hidden_by_idx
  ON public.direct_messages USING GIN (hidden_by);
