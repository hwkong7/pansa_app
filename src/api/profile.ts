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

// 닉네임/사진 변경은 update_my_profile RPC로만 가능하다 (coin 컬럼은 RLS로
// 직접 update가 막혀 있고, 이 RPC도 coin은 건드리지 않는다).
export async function updateMyNickname(userId: string, nickname: string): Promise<void> {
  const { error } = await supabase.rpc('update_my_profile', { p_nickname: nickname });
  if (error) throw error;
}

export async function updateMyPhoto(userId: string, photoUri: string): Promise<void> {
  const { error } = await supabase.rpc('update_my_profile', { p_photo_uri: photoUri });
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
