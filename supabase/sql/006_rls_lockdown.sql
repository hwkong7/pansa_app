-- 006_rls_lockdown.sql
--
-- 안내문서 6번 체크리스트 "RLS 점검 미완" 마무리. 조회는 필요한 범위로 열어두고,
-- 쓰기(insert/update/delete) 정책은 두지 않는다 — 모든 쓰기는 SECURITY DEFINER
-- RPC/트리거(002~005)로만 가능하게 해서, 프론트가 실수/악의적으로 테이블에
-- 직접 insert/update 해도 RLS가 막는다. RPC는 테이블 소유자 권한으로 실행되므로
-- (FORCE ROW LEVEL SECURITY를 걸지 않는 한) 정상 동작한다.
--
-- ⚠️ 이미 이 테이블들에 다른 정책이 걸려 있을 수 있으니, DROP POLICY IF EXISTS로
--    이름이 같은 정책만 교체한다. 적용 전 Supabase Studio → Authentication →
--    Policies 에서 기존 정책 목록을 한 번 확인해달라.

-- ── trials: 목록/상세를 보여줘야 하므로 전체 공개 조회, 쓰기는 RPC 전용 ──
alter table public.trials enable row level security;
drop policy if exists "trials_select_all" on public.trials;
create policy "trials_select_all" on public.trials for select using (true);

-- ── comments: 전체 공개 조회, 쓰기는 add_comment RPC 전용 ─────────────
alter table public.comments enable row level security;
drop policy if exists "comments_select_all" on public.comments;
create policy "comments_select_all" on public.comments for select using (true);

-- ── bets: 득표/베팅 총액이 trials 컬럼에 이미 집계돼 공개 정보이므로
--    전체 공개 조회, 쓰기는 place_bet RPC 전용 ──────────────────────
alter table public.bets enable row level security;
drop policy if exists "bets_select_all" on public.bets;
create policy "bets_select_all" on public.bets for select using (true);

-- ── profiles: 닉네임/프로필사진은 공개 조회, coin 직접 조작을 막기 위해
--    update 정책을 아예 두지 않는다 (닉네임/사진 변경은 update_my_profile
--    RPC로만 가능) ──────────────────────────────────────────────────
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_own_limited" on public.profiles;

-- ── coin_ledger: 금전 내역이므로 본인 것만 조회, 쓰기는 전부 RPC 전용 ──
alter table public.coin_ledger enable row level security;
drop policy if exists "coin_ledger_select_own" on public.coin_ledger;
create policy "coin_ledger_select_own"
  on public.coin_ledger for select
  using (auth.uid() = user_id);
