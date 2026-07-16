-- 005_signup_bonus.sql
--
-- 회원가입 성공 시 P-COIN 500 지급 (요청사항 7).
--
-- ⚠️ auth.users 에 이미 다른 handle_new_user 트리거/함수가 있다면 이 정의로
--    완전히 교체된다 — 적용 전 기존 함수 내용과 비교해달라. 닉네임은
--    프론트에서 supabase.auth.signUp({ options: { data: { nickname } } })로
--    전달하는 raw_user_meta_data.nickname 을 사용한다 (src/api/auth.ts 수정 참고).

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
