-- [백엔드 담당자 요청용] 001_notifications_and_comment_count.sql
--
-- ⚠️ 이 파일은 제가 직접 실행한 게 아니라, 백엔드 담당자에게 "이런 기능을 추가해
--    주세요"라고 전달하기 위한 요청 스펙입니다. create_trial / respond_to_trial /
--    place_bet / profiles(email 포함) 등 가이드에 이미 나와 있는, 이미 구축된
--    기능은 이 파일에서 전혀 건드리지 않습니다.
--
-- 목적: 알림함(재판요청/댓글/베팅/판결 알림) 기능과, 재판 카드에 댓글 수를
-- 추가 쿼리 없이 바로 보여주기 위한 comment_count 컬럼.

-- ── trials.comment_count ────────────────────────────────────────────
alter table public.trials
  add column if not exists comment_count integer not null default 0;

-- ── notifications (신규 테이블) ────────────────────────────────────
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

-- 본인 알림만 조회 가능. insert/update는 004의 SECURITY DEFINER 트리거/RPC로만.
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);
