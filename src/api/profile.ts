import { supabase } from '@/lib/supabase';
import type { CoinLedgerEntry, Profile } from '@/lib/types';

/**
 * 프로필/코인 API (가이드 3-3).
 */

export async function getMyProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

// NOTE: 닉네임/사진 변경용 RPC는 가이드에 없다. 이 가이드에 없는 쓰기 기능이라
// 원칙상 RPC가 있어야 하지만 아직 확정되지 않아, 우선 profiles 테이블 직접
// update로 처리한다. 백엔드 RLS가 본인 행 update를 막아뒀다면 에러가 날 텐데,
// 그 경우 백엔드 담당자에게 "닉네임/사진 변경용 RPC(or 본인 행 update 허용)"를
// 요청해야 한다.
export async function updateMyNickname(userId: string, nickname: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ nickname })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateMyPhoto(userId: string, photoUri: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ photo_uri: photoUri })
    .eq('id', userId);
  if (error) throw error;
}

export async function getMyCoin(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('coin')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return (data?.coin as number) ?? 0;
}

export async function getMyLedger(userId: string): Promise<CoinLedgerEntry[]> {
  const { data, error } = await supabase
    .from('coin_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CoinLedgerEntry[];
}

/**
 * 특정 재판에 대한 내 정산(내 베팅액 / 내 배당). 판결 화면에서 사용.
 * 코인 원장에서 이 재판 관련 +/- 합산.
 */
export async function getMyTrialSettlement(
  userId: string,
  trialId: number
): Promise<{ betAmount: number; payout: number } | null> {
  const ledger = await getMyLedger(userId);
  const related = ledger.filter((e) => e.trial_id === trialId);
  if (related.length === 0) return null;
  const betAmount = related
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + Math.abs(e.amount), 0);
  const payout = related
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
  return { betAmount, payout };
}
