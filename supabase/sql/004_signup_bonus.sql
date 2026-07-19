-- [백엔드 담당자 요청용] 004_signup_bonus.sql
--
-- ⚠️ 요청 스펙입니다 (직접 실행 안 함).
--
-- 목적: 회원가입 성공 시 P-COIN 500 지급.
--
-- ⚠️ 중요: create_trial이 이미 profiles.coin을 참조하는 걸 보면, 회원가입 시
--    auth.users → profiles 행을 만들어주는 트리거(예: handle_new_user)가 이미
--    있을 가능성이 높습니다. 그렇다면 아래 함수를 통째로 새로 만들지 말고,
--    "기존 트리거에서 coin 기본값/insert 값을 500으로 바꿔주세요" 라고 요청하는
--    게 안전합니다. 만약 그런 트리거가 전혀 없다면 아래 정의를 그대로 써도 됩니다.

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, coin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', '익명의판사'),
    500
  )
  on conflict (id) do nothing;

  insert into public.coin_ledger (user_id, amount, reason)
  values (new.id, 500, '회원가입 보상');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
