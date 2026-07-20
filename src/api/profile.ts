import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/upload';
import type { CoinLedgerEntry, Profile } from '@/lib/types';

/**
 * 프로필/코인 API. 코인은 서버 RPC(daily_checkin 등)로만 변경되고, 여기선 조회만 한다.
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

export async function updateMyNickname(userId: string, nickname: string): Promise<void> {
  // profiles 직접 update는 RLS(본인 id만 수정 가능)로 보호돼 있어 안전하다고
  // 백엔드 팀원에게 확인됨 — RPC 없이 이대로 유지.
  const { error } = await supabase
    .from('profiles')
    .update({ nickname })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateMyPhoto(userId: string, localPhotoUri: string): Promise<void> {
  // Storage("media" 버킷)에 업로드 후 공개 URL을 저장한다. 매번 같은 경로(avatar)에
  // upsert하므로, 브라우저/기기 캐시가 갱신 전 이미지를 계속 보여주지 않도록
  // 캐시버스터 쿼리스트링을 붙인다.
  const publicUrl = await uploadImage(userId, localPhotoUri, 'avatar');
  const { error } = await supabase
    .from('profiles')
    .update({ photo_uri: `${publicUrl}?t=${Date.now()}` })
    .eq('id', userId);
  if (error) throw error;
}

// ── 쓰기: 출석체크 (rpc daily_checkin) — 서버가 스트릭을 관리하고 실제로 코인을 지급 ──
export async function dailyCheckin(): Promise<{ reward: number; streak: number }> {
  const { data, error } = await supabase.rpc('daily_checkin');
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { reward: number; streak: number };
  return row;
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
