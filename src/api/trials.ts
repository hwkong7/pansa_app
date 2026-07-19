import { supabase } from '@/lib/supabase';
import type { DefendantProfile, Trial, TrialStatus } from '@/lib/types';

/**
 * 재판 API.
 *
 * ⚠️ 가이드 3-3 핵심 규칙:
 *   - 쓰기(생성/수락/거절/베팅)는 "무조건 rpc" 만 사용한다.
 *   - 읽기(조회)는 .from().select() 자유롭게 사용.
 *   - 마감/정산은 서버가 매분 자동 처리한다. 프론트에서 마감/정산 코드는 만들지 않는다.
 */

// ── 읽기: 피고인 유저 검색 (가이드 3-2 searchDefendantByEmail) ───────
export async function searchDefendantByEmail(email: string): Promise<DefendantProfile | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, nickname, email')
    .eq('email', email.trim())
    .maybeSingle();
  if (error) throw error;
  return (profile as DefendantProfile) ?? null;
}

export interface CreateTrialInput {
  title: string;
  story: string;
  optionA: string;
  optionB: string;
  stake: number;
  defendantId: string;
  photoUris?: string[] | null;
  votingDays?: number;
}

// ── 쓰기: 재판 생성 (rpc create_trial) ─────────────────────────────
// 가이드 3-2 시그니처 그대로: p_title/p_story/p_option_a/p_option_b/p_stake/
// p_defendant_id 6개만 전달한다. photoUris/votingDays는 이 RPC가 아직
// 받지 않는 값이라(가이드에 없음) 여기서 보내지 않는다 — PostgREST는 함수
// 파라미터가 정확히 일치하지 않으면 호출 자체가 실패한다.
export async function createTrial(input: CreateTrialInput): Promise<number> {
  const { data: trialId, error } = await supabase.rpc('create_trial', {
    p_title: input.title,
    p_story: input.story,
    p_option_a: input.optionA,
    p_option_b: input.optionB,
    p_stake: input.stake,
    p_defendant_id: input.defendantId,
  });
  if (error) throw error;
  return trialId as number;
}

// ── 쓰기: 재판 요청 수락/거절 (rpc respond_to_trial) ─────────────────
export async function respondToTrial(trialId: number, accept: boolean) {
  const { error } = await supabase.rpc('respond_to_trial', {
    p_trial_id: trialId,
    p_accept: accept,
  });
  if (error) throw error;
}

// ── 읽기: 재판 목록 (상태 필터, page/pageSize 지정 시에만 페이지네이션 적용) ──
// (가이드 3-7: 목록이 길어질 화면에서는 page를 넘겨 10개씩 끊어 불러올 수 있다.
//  TrialListScreen처럼 검색/정렬을 위해 전체 목록이 필요한 화면은 생략하면 된다.)
export async function listTrials(
  status?: TrialStatus,
  page?: number,
  pageSize = 10
): Promise<Trial[]> {
  let query = supabase
    .from('trials')
    .select('*')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (page != null) query = query.range(page * pageSize, page * pageSize + pageSize - 1);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Trial[];
}

// ── 쓰기: 조회수 +1 (상세화면 진입 시) ──────────────────────────────
export async function incrementTrialView(id: number): Promise<void> {
  // NOTE: 원자적 증가를 위한 RPC(increment_trial_view 등)가 아직 확정되지 않아,
  // 우선 읽고-더하기로 처리한다. 백엔드 확정되면 RPC 호출로 교체 필요.
  const { data, error } = await supabase
    .from('trials')
    .select('view_count')
    .eq('id', id)
    .single();
  if (error) throw error;
  const next = ((data?.view_count as number) ?? 0) + 1;
  const { error: updateError } = await supabase
    .from('trials')
    .update({ view_count: next })
    .eq('id', id);
  if (updateError) throw updateError;
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

// ── 상태 실시간 구독 (가이드 3-6, 반드시 구독 해제) ─────────────────
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

// ── 읽기: 내가 작성한 재판 (마이페이지 '내 사연 내역') ─────────────
export async function listMyTrials(userId: string): Promise<Trial[]> {
  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('plaintiff_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Trial[];
}

// ── 읽기: 내가 피고로 지정된 PENDING 재판 (홈 화면 재판요청 배너용) ──
export async function listPendingTrialsForDefendant(userId: string): Promise<Trial[]> {
  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('defendant_id', userId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Trial[];
}
