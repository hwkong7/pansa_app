import { supabase } from '@/lib/supabase';
import { getMyLedger } from '@/api/profile';
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
 *     충돌한다. 실제 백엔드는 500 초과를 거절한다("500코인까지 가능").
 */
export async function placeBet(
  trialId: number,
  choice: Choice,
  amount: number
) {
  // 클라이언트 1차 검증 (최종 검증은 서버)
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('bets')
    .select('choice, amount, trial:trials(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    choice: Choice;
    amount: number;
    trial: import('@/lib/types').Trial;
  }[];
  if (rows.length === 0) return [];

  // 정산된 베팅의 배당은 코인 원장의 "베팅 보상" 항목에서 합산한다
  // (profile.ts의 getMyTrialSettlement와 같은 패턴).
  const ledger = await getMyLedger(user.id);
  const payoutByTrial = new Map<number, number>();
  for (const entry of ledger) {
    if (entry.trial_id != null && entry.amount > 0 && entry.reason === '베팅 보상') {
      payoutByTrial.set(entry.trial_id, (payoutByTrial.get(entry.trial_id) ?? 0) + entry.amount);
    }
  }

  return rows
    .filter((r) => r.trial)
    .map((r) => ({
      trial: r.trial,
      choice: r.choice,
      amount: r.amount,
      payout: payoutByTrial.get(r.trial.id) ?? 0,
      settled: r.trial.status === 'SETTLED',
    }));
}
