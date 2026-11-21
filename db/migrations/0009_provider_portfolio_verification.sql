ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.service_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title varchar(100) NOT NULL,
  description varchar(500) NOT NULL DEFAULT '',
  image_data text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_portfolio_user_created_idx
  ON public.service_portfolio_items(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_profiles_verified_idx
  ON public.user_profiles(is_verified) WHERE is_verified = true;
