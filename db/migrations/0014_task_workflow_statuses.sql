-- Align live task status constraints with the workflow routes and account actions.
-- Older databases may still have the original four-state constraint from the first migration.
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open', 'paused', 'assigned', 'completed', 'disputed', 'cancelled'));

-- Ensure the lifecycle fields used by the two-sided work workflow exist.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_offer_id uuid REFERENCES public.offers(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS work_started_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completion_requested_at timestamptz;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS rejection_reason text;
