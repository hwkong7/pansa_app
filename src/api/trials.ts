import { supabase } from '@/lib/supabase';
import {
  DEMO_MODE,
  demoCreateTrial,
  demoState,
} from '@/lib/demo';
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

export interface CreateTrialInput {
  title: string;
  story: string;
  optionA: string;
  optionB: string;
  stake: number;
}

// ── 쓰기: 재판 생성 (rpc create_trial) ─────────────────────────────
export async function createTrial(input: CreateTrialInput): Promise<number> {
  if (DEMO_MODE) {
    return demoCreateTrial({
      title: input.title,
      story: input.story,
      stake: input.stake,
    });
  }
  const { data: trialId, error } = await supabase.rpc('create_trial', {
    p_title: input.title,
    p_story: input.story,
    p_option_a: input.optionA,
    p_option_b: input.optionB,
    p_stake: input.stake,
  });
  if (error) throw error;
  return trialId as number;
}

// ── 쓰기: 초대 수락/거절 (rpc respond_to_trial) ─────────────────────
export async function respondToTrial(token: string, accept: boolean) {
  if (DEMO_MODE) return;
  const { error } = await supabase.rpc('respond_to_trial', {
    p_token: token,
    p_accept: accept,
  });
  if (error) throw error;
}

// ── 읽기: 초대 토큰 조회 → 공유 링크 생성 ─────────────────────────
export async function getInviteToken(trialId: number): Promise<string | null> {
  if (DEMO_MODE) {
    return demoState.trials.find((t) => t.id === trialId)?.invite_token ?? null;
  }
  const { data, error } = await supabase
    .from('trials')
    .select('invite_token')
    .eq('id', trialId)
    .single();
  if (error) throw error;
  return (data?.invite_token as string) ?? null;
}

export function buildInviteUrl(inviteToken: string): string {
  return `pansa://invite/${inviteToken}`;
}

// ── 읽기: 재판 목록 (상태 필터) ────────────────────────────────────
export async function listTrials(status?: TrialStatus): Promise<Trial[]> {
  if (DEMO_MODE) {
    const list = status
      ? demoState.trials.filter((t) => t.status === status)
      : demoState.trials;
    return [...list];
  }
  let query = supabase
    .from('trials')
    .select('*')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Trial[];
}

// ── 읽기: 재판 단건 ───────────────────────────────────────────────
export async function getTrial(id: number): Promise<Trial> {
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

// ── 읽기: 토큰으로 재판 단건 (초대 화면 진입) ─────────────────────
export async function getTrialByToken(token: string): Promise<Trial | null> {
  if (DEMO_MODE) {
    return demoState.trials.find((t) => t.invite_token === token) ?? null;
  }
  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('invite_token', token)
    .maybeSingle();
  if (error) throw error;
  return (data as Trial) ?? null;
}

// ── 상태 실시간 구독 (가이드 4장, 선택) ───────────────────────────
export function subscribeTrial(
  id: number,
  onChange: (trial: Trial) => void
): () => void {
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
