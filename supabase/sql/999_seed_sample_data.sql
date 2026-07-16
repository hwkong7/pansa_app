-- 999_seed_sample_data.sql (수동 실행 전용)
--
-- 요청사항 5: "더미는 없애되, 사연+댓글+투표 현황은 몇 개 있어야 함"을 위한
-- 실 DB 샘플 데이터. 프론트 데모 데이터를 지우는 대신, 실제 계정으로 만든
-- 샘플 재판을 DB에 심어둔다.
--
-- ⚠️ 실행 전 준비:
--   1) 앱의 실제 회원가입 화면으로 데모 계정을 3개 만든다 (예: judge1/2/3).
--      -> 005_signup_bonus.sql 트리거가 각자에게 500코인을 자동 지급한다.
--   2) Supabase Studio → Authentication → Users 에서 위 3계정의 UUID를 확인해
--      아래 변수에 채워 넣는다.
--   3) 이 스크립트 전체를 SQL Editor에서 실행한다. RPC를 거치지 않고 테이블에
--      직접 insert 하지만(관리자 권한이므로 RLS는 우회됨), 004의 트리거는
--      정상적으로 붙어 있으므로 comment_count/알림도 함께 채워진다.

do $$
declare
  v_user_a uuid := '00000000-0000-0000-0000-000000000001'; -- ← judge1 UUID로 교체
  v_user_b uuid := '00000000-0000-0000-0000-000000000002'; -- ← judge2 UUID로 교체
  v_user_c uuid := '00000000-0000-0000-0000-000000000003'; -- ← judge3 UUID로 교체
  v_trial_1 bigint;
  v_trial_2 bigint;
  v_trial_3 bigint;
begin
  -- 사연 1: 연애
  insert into public.trials (
    plaintiff_id, defendant_id, title, story, option_a, option_b,
    stake, status, voting_days, votes_a, votes_b, total_votes, total_bet,
    created_at, closes_at
  ) values (
    v_user_a, v_user_b,
    '[연애] 3년 사귄 남친이 제 생일을 두 번 연속 까먹었어요',
    '3년 사귄 남친이 제 생일을 두 번 연속 까먹었어요. 이거 헤어질 사유 될까요...',
    '원고 승', '피고 승', 500, 'OPEN', 3, 4, 3, 7, 3500,
    now() - interval '1 day', now() + interval '2 day'
  ) returning id into v_trial_1;

  -- 사연 2: 가족
  insert into public.trials (
    plaintiff_id, defendant_id, title, story, option_a, option_b,
    stake, status, voting_days, votes_a, votes_b, total_votes, total_bet,
    created_at, closes_at
  ) values (
    v_user_b, v_user_c,
    '[가족] 명절에 시댁 큰집만 가는 거 불공평하지 않나요?',
    '결혼 후 매 명절 시댁 큰집만 들르고 친정은 늘 뒷전이에요...',
    '원고 승', '피고 승', 500, 'OPEN', 3, 5, 4, 9, 4200,
    now() - interval '1 day', now() + interval '2 day'
  ) returning id into v_trial_2;

  -- 사연 3: 친구
  insert into public.trials (
    plaintiff_id, defendant_id, title, story, option_a, option_b,
    stake, status, voting_days, votes_a, votes_b, total_votes, total_bet,
    created_at, closes_at
  ) values (
    v_user_c, v_user_a,
    '[친구] 10년 지기 결혼식 축의금, 얼마가 적당한가요?',
    '10년 넘게 본 친구 결혼식인데 축의금 액수로 고민 중이에요...',
    '원고 승', '피고 승', 200, 'OPEN', 3, 2, 2, 4, 800,
    now() - interval '12 hour', now() + interval '2 day 12 hour'
  ) returning id into v_trial_3;

  -- 댓글 몇 개 (comment_count는 트리거가 자동으로 올려줌)
  insert into public.comments (trial_id, user_id, text) values
    (v_trial_1, v_user_c, '생일 두 번은 좀... 원고 손 들어줍니다'),
    (v_trial_1, v_user_b, '바빴을 수도 있죠. 대화가 먼저인 듯'),
    (v_trial_2, v_user_a, '명절 배분은 미리 합의했어야죠');

  -- 베팅 몇 건 (bets 테이블 컬럼명은 실제 스키마에 맞게 조정 필요)
  insert into public.bets (trial_id, user_id, choice, amount) values
    (v_trial_1, v_user_c, 'A', 500),
    (v_trial_2, v_user_a, 'B', 300);
end $$;
