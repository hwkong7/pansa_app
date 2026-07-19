import { supabase } from '@/lib/supabase';
import { DEMO_MODE } from '@/lib/demo';
import type { Comment, Trial } from '@/lib/types';

/**
 * 댓글 API. 백엔드 팀원 확인 결과(comments 테이블 + add_comment rpc 신설):
 *  - 쓰기는 rpc: add_comment(p_trial_id, p_text). 당사자/관전자 구분 없이 로그인 유저면 누구나 가능.
 *  - 읽기는 자유 select. 재판 상세: comments.eq('trial_id', id). 내 댓글 내역: comments.eq('user_id', userId) + trials 조인.
 */

export interface MyCommentRow {
  id: number;
  text: string;
  created_at: string;
  trial: Trial;
}

// ── 쓰기: 댓글 작성 (rpc add_comment) ──────────────────────────────
export async function addComment(trialId: number, text: string): Promise<void> {
  if (DEMO_MODE) {
    const { demoAddComment } = await import('@/lib/demo');
    demoAddComment(trialId, text);
    return;
  }
  const { error } = await supabase.rpc('add_comment', {
    p_trial_id: trialId,
    p_text: text,
  });
  if (error) throw error;
}

// ── 읽기: 특정 재판의 댓글 목록 ─────────────────────────────────────
export async function listComments(trialId: number): Promise<Comment[]> {
  if (DEMO_MODE) {
    const { demoGetComments } = await import('@/lib/demo');
    return demoGetComments(trialId).map((c) => ({
      id: c.id,
      trial_id: trialId,
      user_id: '',
      text: c.text,
      created_at: c.created_at,
      author: { nickname: c.nickname, photo_uri: c.photo_uri ?? null },
    }));
  }
  // 백엔드가 준 comments 테이블 스키마엔 작성자 닉네임/사진이 없어서(user_id만 있음),
  // profiles 조인을 시도해보고 안 되면(FK 관계가 없어 에러 날 수 있음) 조인 없이 재시도한다.
  const joined = await supabase
    .from('comments')
    .select('*, author:profiles(nickname, photo_uri)')
    .eq('trial_id', trialId)
    .order('created_at', { ascending: true });
  if (!joined.error) return (joined.data ?? []) as unknown as Comment[];

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('trial_id', trialId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

// ── 읽기: 내가 작성한 댓글 (마이페이지) ───────────────────────────
export async function listMyComments(userId: string): Promise<MyCommentRow[]> {
  if (DEMO_MODE) {
    const { demoMyComments } = await import('@/lib/demo');
    return demoMyComments();
  }
  const { data, error } = await supabase
    .from('comments')
    .select('id, text, created_at, trial:trials(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MyCommentRow[];
}
