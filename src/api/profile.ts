import { supabase } from '@/lib/supabase';
import {
  DEMO_MODE,
  DEMO_PROFILE,
  demoLedger,
  demoState,
  demoUpdateNickname,
  demoUpdatePhoto,
} from '@/lib/demo';
import type { CoinLedgerEntry, Profile } from '@/lib/types';

/**
 * 프로필/코인 API (가이드 3-3, 전부 읽기).
 * DEMO_MODE 면 목업 데이터로 동작.
 */

export async function getMyProfile(userId: string): Promise<Profile> {
  if (DEMO_MODE) return DEMO_PROFILE();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateMyNickname(userId: string, nickname: string): Promise<void> {
  if (DEMO_MODE) {
    demoUpdateNickname(nickname);
    return;
  }
  // profiles 직접 update는 RLS(본인 id만 수정 가능)로 보호돼 있어 안전하다고
  // 백엔드 팀원에게 확인됨 — RPC 없이 이대로 유지.
  const { error } = await supabase
    .from('profiles')
    .update({ nickname })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateMyPhoto(userId: string, photoUri: string): Promise<void> {
  if (DEMO_MODE) {
    demoUpdatePhoto(photoUri);
    return;
  }
  // NOTE: 실제 연동 시 스토리지 업로드 후 반환된 공개 URL을 저장해야 하나,
  // 스토리지 버킷/업로드 규칙이 아직 확정되지 않아 우선 photoUri를 그대로 저장한다.
  // (profiles 직접 update 자체는 RLS로 안전하다고 확인됨)
  const { error } = await supabase
    .from('profiles')
    .update({ photo_uri: photoUri })
    .eq('id', userId);
  if (error) throw error;
}

export async function getMyCoin(userId: string): Promise<number> {
  if (DEMO_MODE) return demoState.coin;
  const { data, error } = await supabase
    .from('profiles')
    .select('coin')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return (data?.coin as number) ?? 0;
}

export async function getMyLedger(userId: string): Promise<CoinLedgerEntry[]> {
  if (DEMO_MODE) return demoLedger();
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
 * 데모: demoState.myBets. 실제: 코인 원장에서 이 재판 관련 +/- 합산.
 */
export async function getMyTrialSettlement(
  userId: string,
  trialId: number
): Promise<{ betAmount: number; payout: number } | null> {
  if (DEMO_MODE) {
    const b = demoState.myBets[trialId];
    return b ? { betAmount: b.amount, payout: b.payout } : null;
  }
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
