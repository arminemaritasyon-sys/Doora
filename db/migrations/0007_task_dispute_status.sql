-- Keep task status values aligned with the account controls and dispute workflow.
-- Existing rows are preserved; the constraint is replaced with the complete supported state set.
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open', 'paused', 'assigned', 'completed', 'disputed', 'cancelled'));
