-- 001_schema_notifications_and_comment_count.sql
--
-- 알림함 기능을 위한 notifications 테이블과, TrialCard/HomeScreen에서 댓글 수를
-- 추가 쿼리 없이 바로 보여주기 위한 trials.comment_count 컬럼을 추가한다.
--
-- ⚠️ 이 저장소에는 실제 라이브 Supabase 스키마 정보가 없어(서비스롤 접근 불가),
--    trials/profiles 테이블은 이미 존재한다고 가정하고 작성했다. 적용 전 Supabase
--    Studio에서 테이블명/컬럼명이 실제와 일치하는지 확인해달라.

-- ── trials.comment_count ────────────────────────────────────────────
alter table public.trials
  add column if not exists comment_count integer not null default 0;

-- ── notifications ────────────────────────────────────────────────────
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (
    type in ('TRIAL_REQUEST', 'TRIAL_ACCEPTED', 'COMMENT', 'BET', 'VERDICT', 'TRIAL_CLOSED')
  ),
  trial_id bigint references public.trials(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────
-- 본인 알림만 조회 가능. insert/update 정책은 두지 않는다 — 모든 쓰기는
-- SECURITY DEFINER 트리거/RPC(004_notification_triggers.sql)로만 이뤄진다.
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);
