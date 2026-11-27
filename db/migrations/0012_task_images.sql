CREATE TABLE IF NOT EXISTS public.task_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  image_data text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_images_task_id_created_at_idx
  ON public.task_images (task_id, created_at);
