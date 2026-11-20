CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id text PRIMARY KEY,
  task_updates boolean NOT NULL DEFAULT true,
  offer_updates boolean NOT NULL DEFAULT true,
  wallet_updates boolean NOT NULL DEFAULT true,
  product_updates boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
