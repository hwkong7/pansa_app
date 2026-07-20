import { supabase } from '@/lib/supabase';
import type { Trial, TrialStatus } from '@/lib/types';
import { uploadImage } from '@/lib/upload';

/**
 * 재판 API.
 *
 * ⚠️ 가이드 3-3 핵심 규칙:
 *   - 쓰기(생성/수락/거절/베팅)는 "무조건 rpc" 만 사용한다.
 *   - 읽기(조회)는 .from().select() 자유롭게 사용.
 *   - 마감/정산은 서버가 매분 자동 처리한다. 프론트에서 마감/정산 코드는 만들지 않는다.
 */

export const TRIALS_PAGE_SIZE = 10;
const PAGE_SIZE = TRIALS_PAGE_SIZE;

export interface CreateTrialInput {
  title: string;
  story: string;
  category: string;
  optionA: string;
  optionB: string;
  stake: number;
  defendantId: string; // 상대(피고) 검색으로 알아낸 UUID (가이드 3-2)
  photoUris?: string[] | null;
  votingDays?: number; // 피고 수락 시점부터 적용되는 투표 기간(일). create_trial의 p_voting_days로 전달됨
}

// ── 읽기: 상대방 이메일로 유저 검색 (재판 생성 전 피고 지정용) ───────
export async function searchDefendantByEmail(
  email: string
): Promise<{ id: string; nickname: string | null; email: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, email')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return (data as { id: string; nickname: string | null; email: string }) ?? null;
}

// ── 쓰기: 재판 생성 (rpc create_trial) ─────────────────────────────
export async function createTrial(input: CreateTrialInput): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  // 로컬 기기 사진(file://...)은 서버가 못 읽으므로, rpc 호출 전에 Storage로 먼저
  // 올려서 공개 URL로 바꾼다.
  const localUris = input.photoUris ?? [];
  const photoUrls = await Promise.all(
    localUris.map((uri, idx) => uploadImage(user.id, uri, `trial-${Date.now()}-${idx}`))
  );

  const { data: trialId, error } = await supabase.rpc('create_trial', {
    p_title: input.title,
    p_story: input.story,
    p_category: input.category,
    p_option_a: input.optionA,
    p_option_b: input.optionB,
    p_stake: input.stake,
    p_defendant_id: input.defendantId,
    p_voting_days: input.votingDays ?? 1,
    p_photo_uris: photoUrls.length > 0 ? photoUrls : null,
  });
  if (error) throw error;
  return trialId as number;
}

// ── 쓰기: 초대 수락/거절 (rpc respond_to_trial) ─────────────────────
export async function respondToTrial(trialId: number, accept: boolean) {
  const { error } = await supabase.rpc('respond_to_trial', {
    p_trial_id: trialId,
    p_accept: accept,
  });
  if (error) throw error;
}

// ── 쓰기: 사연 카테고리 수정 (rpc update_trial_category) ────────────
// 판돈/투표 내용엔 영향 없는 순수 표시용 태그라 상태 제한 없이 원고 본인이면 언제나 가능.
export async function updateTrialCategory(trialId: number, category: string): Promise<void> {
  const { error } = await supabase.rpc('update_trial_category', {
    p_trial_id: trialId,
    p_category: category,
  });
  if (error) throw error;
}

// ── 쓰기: 사연 삭제 (rpc cancel_trial) ────────────────────────────
// PENDING(피고 응답 전): 원고 판돈만 환불.
// OPEN(진행중): 원고/피고 판돈 + 이미 걸린 베팅 전부 환불.
// SETTLED(정산 완료): 이미 지급이 끝나 삭제 불가(서버에서 에러 반환).
export async function cancelTrial(trialId: number): Promise<void> {
  const { error } = await supabase.rpc('cancel_trial', { p_trial_id: trialId });
  if (error) throw error;
}

// ── 읽기: 재판 목록 (상태 필터 + 페이지네이션) ──────────────────────
// page: 0부터 시작. 10개씩 끊어서 로딩(가이드 3-7 성능 가이드).
export async function listTrials(status?: TrialStatus, page = 0): Promise<Trial[]> {
  let query = supabase
    .from('trials')
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Trial[];
}

// ── 읽기: 내가 피고로 지정된 PENDING 재판 (홈 '받은 동의요청' 위젯) ──
export async function listIncomingRequests(userId: string): Promise<Trial[]> {
  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('defendant_id', userId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Trial[];
}

// ── 쓰기: 조회수 +1 (상세화면 진입 시, rpc increment_trial_view) ──────
export async function incrementTrialView(id: number): Promise<void> {
  const { error } = await supabase.rpc('increment_trial_view', { p_trial_id: id });
  if (error) throw error;
}

// ── 읽기: 재판 단건 ───────────────────────────────────────────────
export async function getTrial(id: number): Promise<Trial> {
  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Trial;
}

// ── 상태 실시간 구독 (가이드 4장, 선택) ───────────────────────────
export function subscribeTrial(
  id: number,
  onChange: (trial: Trial) => void
): () => void {
  const channel = supabase
    .channel(`trial-${id}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'trials', filter: `id=eq.${id}` },
      (payload) => onChange(payload.new as Trial)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ── 읽기: 내가 작성한 재판 (마이페이지) ───────────────────────────
export async function listMyTrials(userId: string): Promise<Trial[]> {
  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('plaintiff_id', userId)
    .eq('deleted', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Trial[];
}

// ── 읽기: 내 승률 (마이페이지, 정산된 재판의 원고/피고 승패 집계) ──────
export interface MyTrialStats {
  settledCount: number;
  wins: number;
  winRate: number | null; // 무승부 제외 결정된 재판이 하나도 없으면 null
}

export async function getMyTrialStats(userId: string): Promise<MyTrialStats> {
  const { data, error } = await supabase
    .from('trials')
    .select('plaintiff_id, defendant_id, winner')
    .eq('status', 'SETTLED')
    .or(`plaintiff_id.eq.${userId},defendant_id.eq.${userId}`);
  if (error) throw error;
  const rows = data ?? [];
  const decided = rows.filter((t) => t.winner === 'A' || t.winner === 'B');
  const wins = decided.filter(
    (t) =>
      (t.winner === 'A' && t.plaintiff_id === userId) ||
      (t.winner === 'B' && t.defendant_id === userId)
  ).length;
  return {
    settledCount: rows.length,
    wins,
    winRate: decided.length > 0 ? Math.round((wins / decided.length) * 100) : null,
  };
}
