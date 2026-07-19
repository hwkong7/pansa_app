import { supabase } from '@/lib/supabase';
import { DEMO_MODE, demoPlaceBet } from '@/lib/demo';
import { getMyLedger } from '@/api/profile';
import { isSampleTrialId } from '@/lib/sampleTrials';
import { BET_MAX, BET_MIN, type Choice } from '@/lib/types';

/**
 * 참관인 베팅 API (rpc place_bet, 가이드 3-2 ④).
 *
 * 규칙 (가이드 4장): 금액 1~500, 재판당 1회, 당사자 불가, 승패는 득표수 기준.
 *
 * ⚠️ 디자인과의 차이 2건:
 *  1) 디자인은 편 선택(원고/피고)과 베팅이 별도로 보이지만 백엔드엔 무료 투표 RPC가
 *     없어, place_bet 의 choice(A/B)가 곧 '어느 편에 투표+베팅'을 의미한다.
 *  2) 디자인 하단 시트의 빠른 금액(1,000P·2,000P·전액)은 가이드의 베팅 상한(500)과
 *     충돌한다. 실제 백엔드 연동 시 500 초과는 서버가 거절한다("500코인까지 가능").
 *     => 데모 모드에서는 디자인대로 큰 금액도 허용해 화면을 보여준다.
 */
export async function placeBet(
  trialId: number,
  choice: Choice,
  amount: number
) {
  if (isSampleTrialId(trialId)) {
    throw new Error('샘플 사연이라 베팅할 수 없어요');
  }
  if (DEMO_MODE) {
    // 데모: 상한 검증 없이 디자인대로 처리
    demoPlaceBet(trialId, choice, amount);
    return;
  }

  // 실제 연동: 클라이언트 1차 검증 (최종 검증은 서버)
  if (!Number.isInteger(amount) || amount < BET_MIN || amount > BET_MAX) {
    throw new Error(`베팅은 ${BET_MIN}~${BET_MAX}코인까지 가능합니다`);
  }
  const { error } = await supabase.rpc('place_bet', {
    p_trial_id: trialId,
    p_choice: choice,
    p_amount: amount,
  });
  if (error) throw error;
}

// ── 읽기: 내 배팅 내역 (마이페이지) ───────────────────────────────
export interface MyBetRow {
  trial: import('@/lib/types').Trial;
  choice: Choice;
  amount: number;
  payout: number;
  settled: boolean;
}

export async function listMyBets(): Promise<MyBetRow[]> {
  if (DEMO_MODE) {
    const { demoMyBets } = await import('@/lib/demo');
    return demoMyBets();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // 어느 편(A/B)에 베팅했는지는 bets 테이블의 p_choice 컬럼에 저장된다(백엔드 확인,
  // coin_ledger(*, bets(p_choice)) 예시 기준 — 컬럼명이 choice가 아니라 p_choice임에 주의).
  // bets 테이블의 정확한 스키마(예: amount/created_at 존재 여부)는 SQL로 확정된 게 아니라서,
  // 금액(베팅액)과 배당(payout)은 안전하게 coin_ledger 쪽에서만 계산한다.
  const { data, error } = await supabase
    .from('bets')
    .select('trial_id, p_choice, trial:trials(*)')
    .eq('user_id', user.id);
  if (error) throw error;

  const ledger = await getMyLedger(user.id);
  const amountByTrial = new Map<number, number>();
  const payoutByTrial = new Map<number, number>();
  for (const e of ledger) {
    if (e.trial_id == null) continue;
    if (e.amount < 0) amountByTrial.set(e.trial_id, (amountByTrial.get(e.trial_id) ?? 0) + Math.abs(e.amount));
    else payoutByTrial.set(e.trial_id, (payoutByTrial.get(e.trial_id) ?? 0) + e.amount);
  }

  return ((data ?? []) as any[])
    .filter((row) => row.trial)
    .map((row) => ({
      trial: row.trial,
      choice: row.p_choice as Choice,
      amount: amountByTrial.get(row.trial_id) ?? 0,
      payout: payoutByTrial.get(row.trial_id) ?? 0,
      settled: row.trial.status === 'SETTLED',
    }))
    .sort((a, b) => (a.trial.created_at < b.trial.created_at ? 1 : -1));
}
