CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id text PRIMARY KEY,
  display_name varchar(100),
  avatar_url text,
  district varchar(100),
  bio varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  title varchar(100) NOT NULL,
  description text NOT NULL,
  category varchar(60) NOT NULL,
  budget numeric(12,2) NOT NULL CHECK (budget > 0),
  city varchar(100) NOT NULL DEFAULT 'Antalya',
  district varchar(100) NOT NULL,
  address_label varchar(180),
  scheduled_at timestamptz,
  status varchar(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','paused','assigned','completed','disputed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  message varchar(1000),
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.saved_tasks (
  user_id text NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,task_id)
);
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type varchar(50) NOT NULL,
  title varchar(140) NOT NULL,
  body varchar(500) NOT NULL,
  href varchar(500),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  recipient_email varchar(320) NOT NULL,
  template varchar(80) NOT NULL,
  provider varchar(40) NOT NULL DEFAULT 'resend',
  provider_message_id varchar(200),
  status varchar(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_status_created_idx ON public.tasks(status,created_at DESC);
CREATE INDEX IF NOT EXISTS tasks_district_category_idx ON public.tasks(district,category);
CREATE INDEX IF NOT EXISTS tasks_owner_created_idx ON public.tasks(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS offers_task_created_idx ON public.offers(task_id,created_at DESC);
CREATE INDEX IF NOT EXISTS offers_user_created_idx ON public.offers(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS email_events_recipient_created_idx ON public.email_events(recipient_email,created_at DESC);
