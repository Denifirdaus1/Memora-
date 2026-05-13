create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  native_language text,
  preferred_session_duration_min integer not null default 30 check (preferred_session_duration_min between 5 and 120),
  streak_current integer not null default 0 check (streak_current >= 0),
  streak_longest integer not null default 0 check (streak_longest >= 0),
  streak_last_date date,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_threads (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  status text not null default 'empty' check (status in ('empty', 'processing', 'ready', 'needs_review', 'archived')),
  detected_language text,
  detected_topic text,
  settings jsonb not null default '{
    "question_types": {
      "multiple_choice": true,
      "fill_in_blank": true,
      "translation_l1_to_tl": true,
      "translation_tl_to_l1": true,
      "sentence_construction": true
    },
    "difficulty": "relaxed",
    "auto_update_memory": true
  }'::jsonb,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.thread_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  thread_id uuid not null references public.study_threads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content jsonb not null default '{}'::jsonb,
  provider text,
  provider_response_id text,
  token_count integer check (token_count is null or token_count >= 0),
  created_at timestamptz not null default now()
);

create table public.thread_memories (
  thread_id uuid primary key references public.study_threads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  summary text not null default '',
  key_terms text[] not null default '{}'::text[],
  last_compacted_message_id uuid,
  token_budget integer not null default 4000 check (token_budget between 500 and 32000),
  updated_at timestamptz not null default now()
);

create index study_threads_user_activity_idx on public.study_threads (user_id, last_activity_at desc);
create index study_threads_user_status_idx on public.study_threads (user_id, status);
create index thread_messages_thread_created_idx on public.thread_messages (thread_id, created_at);
create index thread_messages_user_created_idx on public.thread_messages (user_id, created_at desc);
create index thread_memories_user_idx on public.thread_memories (user_id);

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger study_threads_set_updated_at
before update on public.study_threads
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.users.display_name, excluded.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.study_threads enable row level security;
alter table public.thread_messages enable row level security;
alter table public.thread_memories enable row level security;

alter table public.users force row level security;
alter table public.study_threads force row level security;
alter table public.thread_messages force row level security;
alter table public.thread_memories force row level security;

create policy users_select_own on public.users
for select to authenticated
using (id = (select auth.uid()));

create policy users_insert_own on public.users
for insert to authenticated
with check (id = (select auth.uid()));

create policy users_update_own on public.users
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy study_threads_select_own on public.study_threads
for select to authenticated
using (user_id = (select auth.uid()));

create policy study_threads_insert_own on public.study_threads
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy study_threads_update_own on public.study_threads
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy study_threads_delete_own on public.study_threads
for delete to authenticated
using (user_id = (select auth.uid()));

create policy thread_messages_select_own on public.thread_messages
for select to authenticated
using (user_id = (select auth.uid()));

create policy thread_messages_insert_own on public.thread_messages
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy thread_messages_update_own on public.thread_messages
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy thread_messages_delete_own on public.thread_messages
for delete to authenticated
using (user_id = (select auth.uid()));

create policy thread_memories_select_own on public.thread_memories
for select to authenticated
using (user_id = (select auth.uid()));

create policy thread_memories_insert_own on public.thread_memories
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy thread_memories_update_own on public.thread_memories
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy thread_memories_delete_own on public.thread_memories
for delete to authenticated
using (user_id = (select auth.uid()));
