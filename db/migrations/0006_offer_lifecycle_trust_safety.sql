ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completion_requested_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS work_started_at timestamptz;
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id text NOT NULL,
  blocked_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON public.user_blocks(blocked_id);
CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id text NOT NULL,
  reported_user_id text,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  category varchar(60) NOT NULL,
  details text NOT NULL DEFAULT '',
  status varchar(30) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reported_user_id IS NOT NULL OR task_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS user_reports_status_created_idx ON public.user_reports(status, created_at DESC);
CREATE TABLE IF NOT EXISTS public.task_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL UNIQUE REFERENCES public.tasks(id) ON DELETE CASCADE,
  opened_by text NOT NULL,
  reason varchar(80) NOT NULL,
  details text NOT NULL DEFAULT '',
  status varchar(30) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS task_disputes_status_created_idx ON public.task_disputes(status, created_at DESC);
