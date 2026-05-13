create table public.review_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  thread_id uuid not null references public.study_threads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  question_count integer not null default 10 check (question_count between 1 and 50),
  current_index integer not null default 0 check (current_index >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  score integer not null default 0 check (score >= 0),
  settings jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_questions (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  thread_id uuid not null references public.study_threads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  knowledge_item_id uuid references public.knowledge_items(id) on delete set null,
  question_order integer not null check (question_order >= 1),
  question_type text not null check (
    question_type in (
      'multiple_choice',
      'fill_in_blank',
      'translation_l1_to_tl',
      'translation_tl_to_l1',
      'sentence_construction'
    )
  ),
  prompt text not null check (char_length(prompt) between 1 and 2000),
  options jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  acceptable_answers text[] not null default '{}',
  user_answer text,
  is_correct boolean,
  feedback text,
  explanation text not null default '',
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, question_order),
  unique (session_id, prompt)
);

create index review_sessions_thread_created_idx on public.review_sessions (thread_id, created_at desc);
create index review_sessions_user_status_idx on public.review_sessions (user_id, status);
create index session_questions_session_order_idx on public.session_questions (session_id, question_order);
create index session_questions_user_answered_idx on public.session_questions (user_id, answered_at);
create index session_questions_knowledge_item_idx on public.session_questions (knowledge_item_id);

create trigger review_sessions_set_updated_at
before update on public.review_sessions
for each row execute function public.set_updated_at();

alter table public.review_sessions enable row level security;
alter table public.session_questions enable row level security;

alter table public.review_sessions force row level security;
alter table public.session_questions force row level security;

create policy review_sessions_select_own on public.review_sessions
for select
using (user_id = auth.uid());

create policy review_sessions_insert_own on public.review_sessions
for insert
with check (user_id = auth.uid());

create policy review_sessions_update_own on public.review_sessions
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy review_sessions_delete_own on public.review_sessions
for delete
using (user_id = auth.uid());

create policy session_questions_select_own on public.session_questions
for select
using (user_id = auth.uid());

create policy session_questions_insert_own on public.session_questions
for insert
with check (user_id = auth.uid());

create policy session_questions_update_own on public.session_questions
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy session_questions_delete_own on public.session_questions
for delete
using (user_id = auth.uid());
