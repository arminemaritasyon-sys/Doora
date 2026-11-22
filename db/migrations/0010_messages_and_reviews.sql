CREATE TABLE IF NOT EXISTS public.task_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reviewer_id text NOT NULL,
  reviewee_id text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment varchar(1000) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, reviewer_id),
  CHECK (reviewer_id <> reviewee_id)
);

CREATE INDEX IF NOT EXISTS task_reviews_reviewee_created_idx
  ON public.task_reviews(reviewee_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL,
  recipient_id text NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  body varchar(2000) NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS direct_messages_sender_created_idx
  ON public.direct_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_recipient_created_idx
  ON public.direct_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_thread_idx
  ON public.direct_messages(sender_id, recipient_id, task_id, created_at);
