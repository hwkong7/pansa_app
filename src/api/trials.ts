import { supabase } from '@/lib/supabase';
import type { Trial, TrialStatus } from '@/lib/types';

/**
 * 재판 API.
 *
 * ⚠️ 가이드 3-3 핵심 규칙:
 *   - 쓰기(생성/수락/거절/베팅)는 "무조건 rpc" 만 사용한다.
 *   - 읽기(조회)는 .from().select() 자유롭게 사용.
 *   - 마감/정산은 서버가 매분 자동 처리한다. 프론트에서 마감/정산 코드는 만들지 않는다.
 */

export interface CreateTrialInput {
  title: string;
  story: string;
  optionA: string;
  optionB: string;
  stake: number;
  defendantNickname: string;
  photoUris?: string[] | null;
  votingDays?: number;
}

// ── 쓰기: 재판 생성 (rpc create_trial) ─────────────────────────────
export async function createTrial(input: CreateTrialInput): Promise<number> {
  // NOTE: photoUris는 사진 업로드/스토리지 규칙이 아직 확정되지 않아 RPC에는
  // 아직 전달하지 않는다 (백엔드 확정되면 별도 파라미터/업로드 플로우 추가 필요).
  const { data: trialId, error } = await supabase.rpc('create_trial', {
    p_title: input.title,
    p_story: input.story,
    p_option_a: input.optionA,
    p_option_b: input.optionB,
    p_stake: input.stake,
    p_defendant_nickname: input.defendantNickname,
    p_voting_days: input.votingDays,
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

// ── 읽기: 재판 목록 (상태 필터) ────────────────────────────────────
export async function listTrials(status?: TrialStatus): Promise<Trial[]> {
  let query = supabase
    .from('trials')
    .select('*')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
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
