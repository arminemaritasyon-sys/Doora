-- DOORA core marketplace schema
-- Apply with Supabase CLI: supabase db push
create extension if not exists pgcrypto;

create type public.task_status as enum ('open', 'assigned', 'in_progress', 'completed', 'cancelled');
create type public.offer_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  bio text not null default '',
  city text not null default '',
  district text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 90),
  description text not null check (char_length(description) between 15 and 2000),
  category text not null,
  budget integer not null check (budget > 0 and budget <= 10000000),
  location_text text not null,
  scheduled_at timestamptz,
  image_url text,
  status public.task_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  message text not null check (char_length(message) between 10 and 800),
  status public.offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique(task_id, sender_id)
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, task_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete set null,
  participant_one uuid not null references public.profiles(id) on delete cascade,
  participant_two uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (participant_one <> participant_two),
  unique(task_id, participant_one, participant_two)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists tasks_feed_idx on public.tasks(status, created_at desc);
create index if not exists tasks_category_idx on public.tasks(category, status);
create index if not exists tasks_owner_idx on public.tasks(owner_id, created_at desc);
create index if not exists offers_task_idx on public.offers(task_id, created_at desc);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.offers enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;

create policy "Profiles are visible to authenticated users" on public.profiles
for select to authenticated using (true);
create policy "Users create their own profile" on public.profiles
for insert to authenticated with check (auth.uid() = id);
create policy "Users update their own profile" on public.profiles
for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Open tasks are publicly readable" on public.tasks
for select using (status = 'open' or owner_id = auth.uid());
create policy "Authenticated users create tasks" on public.tasks
for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners update their tasks" on public.tasks
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners delete their tasks" on public.tasks
for delete to authenticated using (owner_id = auth.uid());

create policy "Offer parties can read offers" on public.offers
for select to authenticated using (
  sender_id = auth.uid() or exists (
    select 1 from public.tasks t where t.id = task_id and t.owner_id = auth.uid()
  )
);
create policy "Authenticated users create offers" on public.offers
for insert to authenticated with check (
  sender_id = auth.uid() and exists (
    select 1 from public.tasks t where t.id = task_id and t.status = 'open' and t.owner_id <> auth.uid()
  )
);
create policy "Task owners update offer status" on public.offers
for update to authenticated using (
  exists (select 1 from public.tasks t where t.id = task_id and t.owner_id = auth.uid())
) with check (
  exists (select 1 from public.tasks t where t.id = task_id and t.owner_id = auth.uid())
);

create policy "Users manage their favorites" on public.favorites
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Conversation participants can read" on public.conversations
for select to authenticated using (auth.uid() in (participant_one, participant_two));
create policy "Participants can create conversations" on public.conversations
for insert to authenticated with check (auth.uid() in (participant_one, participant_two));
create policy "Conversation participants can read messages" on public.messages
for select to authenticated using (
  exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.participant_one, c.participant_two))
);
create policy "Participants can send messages" on public.messages
for insert to authenticated with check (
  sender_id = auth.uid() and exists (
    select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.participant_one, c.participant_two)
  )
);
create policy "Users submit reports" on public.reports
for insert to authenticated with check (reporter_id = auth.uid());

-- Create a profile automatically after signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Optional private image bucket. Keep uploads restricted to the authenticated owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-images', 'task-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "Task images are publicly readable" on storage.objects
for select using (bucket_id = 'task-images');
create policy "Users upload task images into their folder" on storage.objects
for insert to authenticated with check (
  bucket_id = 'task-images' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "Users update their own task images" on storage.objects
for update to authenticated using (
  bucket_id = 'task-images' and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'task-images' and (storage.foldername(name))[1] = auth.uid()::text
);