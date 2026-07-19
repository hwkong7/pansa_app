-- [백엔드 담당자 요청용] 002_comment_rpc.sql
--
-- ⚠️ 요청 스펙입니다 (직접 실행 안 함). create_trial/respond_to_trial/place_bet은
--    건드리지 않습니다.
--
-- 목적: 댓글이 지금은 프론트 목업으로만 동작합니다. 실제 댓글 작성을 위한 RPC.
-- 쓰기는 가이드 원칙(3-2)대로 RPC로만 하고 싶어서 add_comment 하나를 요청합니다.

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
