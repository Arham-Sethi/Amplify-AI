-- Amplify product backend — prompt_logs + user_settings
-- Run in Supabase SQL editor (or via migration CLI).
--
-- Two tables:
--   public.prompt_logs    one row per classify/grade/rewrite/compress call.
--                         Stores ONLY scrubbed prompt text. No raw secrets.
--   public.user_settings  per-user preferences (target LLM, tone, work
--                         context, default intensity).
--
-- RLS: users can read their own rows. Inserts go through the service-role
-- client in lib/supabase.js (which bypasses RLS), so end users never get
-- write privileges directly on the prompt_logs table.

-- ─────────────────────────────────────────────────────────────────────────
-- prompt_logs
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.prompt_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  request_id      text not null,
  kind            text not null check (kind in ('classify', 'grade', 'rewrite', 'compress')),
  -- Category check matches CLAUDE.md §6 (locked decision L5): the 6
  -- active categories. The previous draft of this migration listed
  -- `open_ended_generation` (the archived 7th category) — that would
  -- have rejected every `vague_instruction` insert at runtime.
  category        text check (
    category is null
    or category in ('task_only', 'context_heavy', 'vague_instruction',
                    'multi_step_workflow', 'role_persona', 'debug_fix')
  ),
  is_vague        boolean,
  score_before    integer check (score_before is null or (score_before between 0 and 100)),
  score_after     integer check (score_after  is null or (score_after  between 0 and 100)),
  intensity       text check (intensity is null or intensity in ('gentle', 'medium', 'aggressive')),
  target_llm      text,
  model           text,
  latency_ms      integer not null check (latency_ms >= 0),
  prompt_scrubbed     text,   -- scrubbed user input (PII / secrets removed)
  rewritten_scrubbed  text,   -- scrubbed rewrite (rewrite endpoint only)
  scrub_counts    jsonb,      -- { ANTHROPIC_KEY: 1, EMAIL: 2, ... }
  error           text,
  created_at      timestamptz not null default now()
);

create index if not exists prompt_logs_user_id_created_at_idx
  on public.prompt_logs (user_id, created_at desc);

create index if not exists prompt_logs_request_id_idx
  on public.prompt_logs (request_id);

alter table public.prompt_logs enable row level security;

-- Users can read their own rows. Service role (used by lib/supabase.js)
-- bypasses RLS automatically — no INSERT policy needed for it.
drop policy if exists prompt_logs_read_own on public.prompt_logs;
create policy prompt_logs_read_own
  on public.prompt_logs
  for select
  to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- user_settings
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.user_settings (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  target_llm         text    not null default 'claude'
                              check (target_llm in ('claude', 'gpt', 'gemini', 'grok', 'other')),
  tone               text    not null default 'work'
                              check (tone in ('work', 'casual', 'technical', 'warm', 'neutral')),
  work_context       text    not null default '' check (char_length(work_context) <= 1000),
  token_budget       integer not null default 4096 check (token_budget between 256 and 200000),
  default_intensity  text    not null default 'medium'
                              check (default_intensity in ('gentle', 'medium', 'aggressive')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists user_settings_read_own on public.user_settings;
create policy user_settings_read_own
  on public.user_settings
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists user_settings_upsert_own on public.user_settings;
create policy user_settings_upsert_own
  on public.user_settings
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own
  on public.user_settings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Touch updated_at on every UPDATE.
create or replace function public.touch_user_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_settings_touch on public.user_settings;
create trigger user_settings_touch
  before update on public.user_settings
  for each row
  execute function public.touch_user_settings_updated_at();

-- Auto-create a default user_settings row on first sign-up so the
-- backend never has to handle the "first request from a new user"
-- edge case. The defaults are the most-conservative ones — a brand
-- new user gets `claude` + `medium` + `work` tone until they finish
-- onboarding.
create or replace function public.create_default_user_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_default_settings on auth.users;
create trigger on_auth_user_created_default_settings
  after insert on auth.users
  for each row
  execute function public.create_default_user_settings();

-- Backfill: every existing waitlist user gets a default row too.
insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- Retention (run manually after enabling pg_cron in Supabase)
-- ─────────────────────────────────────────────────────────────────────────
-- 7 days: trim prompt + rewrite text but keep metadata for analytics.
-- 90 days: hard-delete the row entirely.
--
-- Uncomment after `create extension if not exists pg_cron;` is enabled.
--
-- select cron.schedule(
--   'prompt-logs-trim-text-7d',
--   '0 4 * * *',
--   $$update public.prompt_logs
--     set prompt_scrubbed = null, rewritten_scrubbed = null
--     where created_at < now() - interval '7 days'
--       and (prompt_scrubbed is not null or rewritten_scrubbed is not null);$$
-- );
--
-- select cron.schedule(
--   'prompt-logs-purge-90d',
--   '15 4 * * *',
--   $$delete from public.prompt_logs where created_at < now() - interval '90 days';$$
-- );
