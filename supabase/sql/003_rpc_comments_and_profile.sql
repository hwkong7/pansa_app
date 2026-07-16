-- 003_rpc_comments_and_profile.sql
--
-- add_comment: 댓글을 프론트 목업이 아니라 실제 DB에 쓰기 위한 RPC.
-- update_my_profile: 닉네임/사진만 바꿀 수 있는 RPC. 006_rls_lockdown.sql에서
-- profiles 테이블의 직접 update 정책을 없애므로, 닉네임/사진 변경은 반드시
-- 이 RPC를 거쳐야 한다 (coin 컬럼은 이 함수가 아예 건드리지 않으므로 코인 직접
-- 조작 경로가 차단된다).

-- ── add_comment ─────────────────────────────────────────────────────
create or replace function public.add_comment(
  p_trial_id bigint,
  p_text text
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id bigint;
begin
  if v_uid is null then
    raise exception '로그인이 필요해요.';
  end if;

  if p_text is null or length(trim(p_text)) = 0 then
    raise exception '댓글 내용을 입력해주세요.';
  end if;

  if not exists (select 1 from public.trials where id = p_trial_id) then
    raise exception '재판을 찾을 수 없어요.';
  end if;

  insert into public.comments (trial_id, user_id, text)
  values (p_trial_id, v_uid, trim(p_text))
  returning id into v_id;

  return v_id;
end;
$$;

-- ── update_my_profile ───────────────────────────────────────────────
create or replace function public.update_my_profile(
  p_nickname text default null,
  p_photo_uri text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception '로그인이 필요해요.';
  end if;

  update public.profiles
  set
    nickname = coalesce(p_nickname, nickname),
    photo_uri = coalesce(p_photo_uri, photo_uri)
  where id = v_uid;
end;
$$;
