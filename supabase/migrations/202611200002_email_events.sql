-- Transactional email delivery log. No client policies: service role only.
create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('welcome','task_created','offer_received','offer_accepted','offer_rejected')),
  event_key text not null unique,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists email_events_recipient_idx on public.email_events(recipient_id, created_at desc);
alter table public.email_events enable row level security;
