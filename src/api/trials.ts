import { supabase } from '@/lib/supabase';
import {
  DEMO_MODE,
  demoCreateTrial,
  demoIncomingRequests,
  demoIncrementView,
  demoRespondToTrial,
  demoSearchDefendant,
  demoState,
} from '@/lib/demo';
import { getSampleTrial, isSampleTrialId, SAMPLE_TRIALS } from '@/lib/sampleTrials';
import type { Trial, TrialStatus } from '@/lib/types';

/**
 * 재판 API.
 *
 * ⚠️ 가이드 3-3 핵심 규칙:
 *   - 쓰기(생성/수락/거절/베팅)는 "무조건 rpc" 만 사용한다.
 *   - 읽기(조회)는 .from().select() 자유롭게 사용.
 *   - 마감/정산은 서버가 매분 자동 처리한다. 프론트에서 마감/정산 코드는 만들지 않는다.
 *
 * DEMO_MODE 가 true 면 백엔드 대신 목업 데이터로 동작한다 (src/lib/demo.ts).
 */

const PAGE_SIZE = 10;

export interface CreateTrialInput {
  title: string;
  story: string;
  optionA: string;
  optionB: string;
  stake: number;
  defendantId: string; // 상대(피고) 검색으로 알아낸 UUID (가이드 3-2)
  photoUris?: string[] | null;
  votingDays?: number; // 실제 create_trial RPC엔 파라미터가 없어 데모 전용으로만 씀
}

// ── 읽기: 상대방 이메일로 유저 검색 (재판 생성 전 피고 지정용) ───────
export async function searchDefendantByEmail(
  email: string
): Promise<{ id: string; nickname: string | null; email: string } | null> {
  if (DEMO_MODE) return demoSearchDefendant(email);
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
  if (DEMO_MODE) {
    return demoCreateTrial({
      title: input.title,
      story: input.story,
      stake: input.stake,
      photoUris: input.photoUris ?? null,
      votingDays: input.votingDays,
    });
  }
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

// ── 쓰기: 초대 수락/거절 (rpc respond_to_trial) ─────────────────────
export async function respondToTrial(trialId: number, accept: boolean) {
  if (DEMO_MODE) {
    demoRespondToTrial(trialId, accept);
    return;
  }
  const { error } = await supabase.rpc('respond_to_trial', {
    p_trial_id: trialId,
    p_accept: accept,
  });
  if (error) throw error;
}

// ── 읽기: 재판 목록 (상태 필터 + 페이지네이션) ──────────────────────
// page: 0부터 시작. 10개씩 끊어서 로딩(가이드 3-7 성능 가이드).
export async function listTrials(status?: TrialStatus, page = 0): Promise<Trial[]> {
  if (DEMO_MODE) {
    const list = demoState.trials.filter(
      (t) => !t.deleted && (!status || t.status === status)
    );
    return list.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  }
  let query = supabase
    .from('trials')
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  const real = (data ?? []) as Trial[];
  // 실제 DB가 아직 비어있어도 피드가 허전해 보이지 않도록, 1페이지에 한해 하드코딩 샘플을
  // 곁들여 보여준다(가이드용 고정 콘텐츠 — src/lib/sampleTrials.ts 참고).
  if (page > 0) return real;
  const samples = SAMPLE_TRIALS.filter((t) => !status || t.status === status);
  return [...real, ...samples];
}

// ── 읽기: 내가 피고로 지정된 PENDING 재판 (홈 '받은 동의요청' 위젯) ──
export async function listIncomingRequests(userId: string): Promise<Trial[]> {
  if (DEMO_MODE) return demoIncomingRequests();
  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('defendant_id', userId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Trial[];
}

// ── 쓰기: 조회수 +1 (상세화면 진입 시) ──────────────────────────────
export async function incrementTrialView(id: number): Promise<void> {
  if (isSampleTrialId(id)) return; // 샘플은 조회수 갱신 안 함
  if (DEMO_MODE) {
    demoIncrementView(id);
    return;
  }
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
  if (isSampleTrialId(id)) {
    const t = getSampleTrial(id);
    if (!t) throw new Error('재판을 찾을 수 없어요');
    return { ...t };
  }
  if (DEMO_MODE) {
    const t = demoState.trials.find((x) => x.id === id);
    if (!t) throw new Error('재판을 찾을 수 없어요');
    return { ...t };
  }
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
  if (isSampleTrialId(id)) return () => {}; // 샘플: 실시간 구독 없음
  if (DEMO_MODE) return () => {}; // 데모: 구독 없음
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
  if (DEMO_MODE) {
    const { demoMyTrials } = await import('@/lib/demo');
    return demoMyTrials();
  }
  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('plaintiff_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Trial[];
}
