-- 002_rpc_trials.sql
--
-- create_trial / respond_to_trial 재작성.
--
-- 변경 이유: 기존에는 "초대 토큰을 아는 누구나 수락 가능"한 구조였는데, 이번
-- 요청사항(재판 생성 시 피고를 특정해 알림을 보내야 함)에 따라 사연 작성 시
-- 상대방 닉네임으로 피고를 지정하고, 수락/거절도 토큰이 아니라 trial_id +
-- auth.uid() 로 본인 확인하도록 바꾼다.
--
-- ⚠️ 기존에 같은 이름의 함수가 이미 있다면 이 정의로 완전히 교체된다.
--    place_bet, 정산(매분 자동) 로직은 이 파일에서 건드리지 않는다.

-- ── create_trial ────────────────────────────────────────────────────
create or replace function public.create_trial(
  p_title text,
  p_story text,
  p_option_a text,
  p_option_b text,
  p_stake integer,
  p_defendant_nickname text,
  p_voting_days integer default 3
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plaintiff uuid := auth.uid();
  v_defendant uuid;
  v_coin integer;
  v_trial_id bigint;
begin
  if v_plaintiff is null then
    raise exception '로그인이 필요해요.';
  end if;

  if p_stake is null or p_stake < 50 then
    raise exception '판돈은 최소 50P 이상이어야 해요.';
  end if;

  if p_defendant_nickname is null or length(trim(p_defendant_nickname)) = 0 then
    raise exception '상대방 닉네임을 입력해주세요.';
  end if;

  select id into v_defendant
  from public.profiles
  where nickname = trim(p_defendant_nickname)
  limit 1;

  if v_defendant is null then
    raise exception '상대방을 찾을 수 없어요. 닉네임을 확인해주세요.';
  end if;

  if v_defendant = v_plaintiff then
    raise exception '본인을 상대로 재판을 만들 수 없어요.';
  end if;

  select coin into v_coin from public.profiles where id = v_plaintiff for update;
  if v_coin is null or v_coin < p_stake then
    raise exception '코인이 부족해요.';
  end if;

  update public.profiles set coin = coin - p_stake where id = v_plaintiff;

  insert into public.trials (
    plaintiff_id, defendant_id, title, story, option_a, option_b,
    stake, status, voting_days, created_at
  ) values (
    v_plaintiff, v_defendant, p_title, p_story, p_option_a, p_option_b,
    p_stake, 'PENDING', p_voting_days, now()
  )
  returning id into v_trial_id;

  insert into public.coin_ledger (user_id, amount, reason, trial_id)
  values (v_plaintiff, -p_stake, '재판 판돈', v_trial_id);

  return v_trial_id;
end;
$$;

-- ── respond_to_trial ─────────────────────────────────────────────────
create or replace function public.respond_to_trial(
  p_trial_id bigint,
  p_accept boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_trial public.trials%rowtype;
  v_coin integer;
begin
  if v_uid is null then
    raise exception '로그인이 필요해요.';
  end if;

  select * into v_trial from public.trials where id = p_trial_id for update;
  if not found then
    raise exception '재판을 찾을 수 없어요.';
  end if;

  if v_trial.defendant_id is distinct from v_uid then
    raise exception '이 재판에 응답할 권한이 없어요.';
  end if;

  if v_trial.status <> 'PENDING' then
    raise exception '이미 처리된 재판이에요.';
  end if;

  if p_accept then
    select coin into v_coin from public.profiles where id = v_uid for update;
    if v_coin is null or v_coin < v_trial.stake then
      raise exception '코인이 부족해요.';
    end if;

    update public.profiles set coin = coin - v_trial.stake where id = v_uid;

    insert into public.coin_ledger (user_id, amount, reason, trial_id)
    values (v_uid, -v_trial.stake, '재판 판돈', p_trial_id);

    update public.trials
    set status = 'OPEN',
        closes_at = now() + make_interval(days => coalesce(v_trial.voting_days, 3))
    where id = p_trial_id;
  else
    update public.profiles set coin = coin + v_trial.stake where id = v_trial.plaintiff_id;

    insert into public.coin_ledger (user_id, amount, reason, trial_id)
    values (v_trial.plaintiff_id, v_trial.stake, '판돈 환불', p_trial_id);

    update public.trials set status = 'REJECTED' where id = p_trial_id;
  end if;
end;
$$;
