insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'temp-uploads',
  'temp-uploads',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.thread_uploads (
  id uuid primary key default extensions.gen_random_uuid(),
  thread_id uuid not null references public.study_threads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  file_name text not null,
  file_size_bytes integer check (file_size_bytes is null or file_size_bytes >= 0),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  page_count integer check (page_count is null or page_count >= 0),
  status text not null default 'queued' check (status in ('queued', 'processing', 'done', 'failed', 'deleted')),
  storage_bucket text not null default 'temp-uploads',
  storage_path text not null,
  storage_deleted_at timestamptz,
  extraction_summary jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.upload_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  upload_id uuid not null references public.thread_uploads(id) on delete cascade,
  thread_id uuid not null references public.study_threads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'done', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.knowledge_items (
  id uuid primary key default extensions.gen_random_uuid(),
  thread_id uuid not null references public.study_threads(id) on delete cascade,
  upload_id uuid references public.thread_uploads(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  item_type text not null check (item_type in ('vocabulary', 'grammar_pattern', 'exercise_type', 'topic_context')),
  target_language text not null default 'unknown',
  content jsonb not null,
  source_page_hint text,
  times_seen integer not null default 0 check (times_seen >= 0),
  times_correct integer not null default 0 check (times_correct >= 0),
  created_at timestamptz not null default now()
);

create index thread_uploads_thread_created_idx on public.thread_uploads (thread_id, created_at desc);
create index thread_uploads_user_status_idx on public.thread_uploads (user_id, status);
create index upload_jobs_upload_idx on public.upload_jobs (upload_id);
create index upload_jobs_user_status_idx on public.upload_jobs (user_id, status);
create index knowledge_items_thread_type_idx on public.knowledge_items (thread_id, item_type);
create index knowledge_items_user_created_idx on public.knowledge_items (user_id, created_at desc);

create trigger upload_jobs_set_updated_at
before update on public.upload_jobs
for each row execute function public.set_updated_at();

alter table public.thread_uploads enable row level security;
alter table public.upload_jobs enable row level security;
alter table public.knowledge_items enable row level security;

alter table public.thread_uploads force row level security;
alter table public.upload_jobs force row level security;
alter table public.knowledge_items force row level security;

create policy thread_uploads_select_own on public.thread_uploads
for select to authenticated
using (user_id = (select auth.uid()));

create policy thread_uploads_insert_own on public.thread_uploads
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy thread_uploads_update_own on public.thread_uploads
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy thread_uploads_delete_own on public.thread_uploads
for delete to authenticated
using (user_id = (select auth.uid()));

create policy upload_jobs_select_own on public.upload_jobs
for select to authenticated
using (user_id = (select auth.uid()));

create policy upload_jobs_insert_own on public.upload_jobs
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy upload_jobs_update_own on public.upload_jobs
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy knowledge_items_select_own on public.knowledge_items
for select to authenticated
using (user_id = (select auth.uid()));

create policy knowledge_items_insert_own on public.knowledge_items
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy knowledge_items_update_own on public.knowledge_items
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy knowledge_items_delete_own on public.knowledge_items
for delete to authenticated
using (user_id = (select auth.uid()));

create policy temp_uploads_insert_own_prefix on storage.objects
for insert to authenticated
with check (
  bucket_id = 'temp-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy temp_uploads_select_own_prefix on storage.objects
for select to authenticated
using (
  bucket_id = 'temp-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy temp_uploads_delete_own_prefix on storage.objects
for delete to authenticated
using (
  bucket_id = 'temp-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
