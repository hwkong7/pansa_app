-- [백엔드 담당자 요청용] 003_notification_triggers.sql
--
-- ⚠️ 요청 스펙입니다 (직접 실행 안 함). create_trial/respond_to_trial/place_bet의
--    내부 로직은 전혀 수정하지 않습니다 — 그 함수들이 하는 일(코인 차감, 상태
--    변경 등)에 반응해서 알림만 "추가로" 쌓는 트리거입니다. 이미 있는 함수를
--    고치지 않아도 되니 충돌 위험이 없습니다.
--
-- ⚠️ bets 테이블(trial_id, user_id, choice, amount 컬럼)이 있다고 가정합니다 —
--    place_bet 파라미터로 미루어 추정한 것이라, 실제 컬럼명이 다르면
--    trg_notify_new_bet 부분을 맞게 조정해주세요.

-- ── 1) 재판 생성 → 피고에게 "재판 요청" 알림 ──────────────────────────
create or replace function public.notify_trial_insert() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_nick text;
begin
  select nickname into v_actor_nick from public.profiles where id = new.plaintiff_id;

  insert into public.notifications (user_id, type, trial_id, actor_id, message)
  values (
    new.defendant_id,
    'TRIAL_REQUEST',
    new.id,
    new.plaintiff_id,
    coalesce(v_actor_nick, '익명의판사') || '님이 재판을 요청했습니다.'
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_trial_insert on public.trials;
create trigger trg_notify_trial_insert
  after insert on public.trials
  for each row
  when (new.defendant_id is not null)
  execute function public.notify_trial_insert();

-- ── 2) 재판 상태 변경 → 성립/취소/판결 알림 ────────────────────────────
create or replace function public.notify_trial_status_change() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'PENDING' and new.status = 'OPEN' then
    insert into public.notifications (user_id, type, trial_id, message)
    values (new.plaintiff_id, 'TRIAL_ACCEPTED', new.id, '재판이 성립되었습니다.');

  elsif new.status = 'REJECTED' and old.status is distinct from 'REJECTED' then
    insert into public.notifications (user_id, type, trial_id, message)
    values (new.plaintiff_id, 'TRIAL_CLOSED', new.id, '재판이 성립되지 않았습니다 (판돈 환불됨).');

  elsif new.status = 'SETTLED' and old.status is distinct from 'SETTLED' then
    insert into public.notifications (user_id, type, trial_id, message)
    select p_id, 'VERDICT', new.id,
      case
        when new.winner is null then '재판이 무승부로 종료됐어요 (전원 환불).'
        when new.winner = 'A' then '원고 승으로 재판이 종료됐어요.'
        else '피고 승으로 재판이 종료됐어요.'
      end
    from unnest(array[new.plaintiff_id, new.defendant_id]) as p_id
    where p_id is not null;

    insert into public.notifications (user_id, type, trial_id, message)
    select distinct b.user_id, 'TRIAL_CLOSED', new.id, '베팅한 재판이 종료됐어요. 결과를 확인해보세요.'
    from public.bets b
    where b.trial_id = new.id
      and b.user_id not in (new.plaintiff_id, new.defendant_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_trial_status on public.trials;
create trigger trg_notify_trial_status
  after update of status on public.trials
  for each row
  when (old.status is distinct from new.status)
  execute function public.notify_trial_status_change();

-- ── 3) 베팅 발생 → 재판 당사자에게 알림 ────────────────────────────────
create or replace function public.notify_new_bet() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plaintiff uuid;
  v_defendant uuid;
begin
  select plaintiff_id, defendant_id into v_plaintiff, v_defendant
  from public.trials where id = new.trial_id;

  insert into public.notifications (user_id, type, trial_id, actor_id, message)
  select p_id, 'BET', new.trial_id, new.user_id, '내 재판에 새로운 베팅이 있어요.'
  from unnest(array[v_plaintiff, v_defendant]) as p_id
  where p_id is not null and p_id <> new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_notify_new_bet on public.bets;
create trigger trg_notify_new_bet
  after insert on public.bets
  for each row
  execute function public.notify_new_bet();

-- ── 4) 댓글 작성(002의 add_comment) → 알림 + comment_count 증가 ───────
create or replace function public.notify_new_comment() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plaintiff uuid;
  v_defendant uuid;
begin
  update public.trials
  set comment_count = comment_count + 1
  where id = new.trial_id
  returning plaintiff_id, defendant_id into v_plaintiff, v_defendant;

  insert into public.notifications (user_id, type, trial_id, actor_id, message)
  select p_id, 'COMMENT', new.trial_id, new.user_id, '내 재판에 새 댓글이 달렸어요.'
  from unnest(array[v_plaintiff, v_defendant]) as p_id
  where p_id is not null and p_id <> new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_notify_new_comment on public.comments;
create trigger trg_notify_new_comment
  after insert on public.comments
  for each row
  execute function public.notify_new_comment();

-- ── 읽음 처리 RPC ────────────────────────────────────────────────────
create or replace function public.mark_notifications_read(p_ids bigint[]) returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set is_read = true
  where user_id = auth.uid() and id = any(p_ids);
$$;

create or replace function public.mark_all_notifications_read() returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set is_read = true
  where user_id = auth.uid() and is_read = false;
$$;
