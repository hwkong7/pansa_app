import { supabase } from '@/lib/supabase';
import type { Trial } from '@/lib/types';

export interface MyCommentRow {
  id: number;
  text: string;
  created_at: string;
  trial: Trial;
}

// ── 읽기: 내가 작성한 댓글 (마이페이지) ───────────────────────────
export async function listMyComments(userId: string): Promise<MyCommentRow[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, text, created_at, trial:trials(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MyCommentRow[];
}

// ── 읽기: 특정 재판의 댓글 목록 (재판 상세 화면) ────────────────────
export interface TrialCommentRow {
  id: number;
  text: string;
  created_at: string;
  user_id: string;
  nickname: string | null;
  photo_uri: string | null;
}

export async function listCommentsForTrial(trialId: number): Promise<TrialCommentRow[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, text, created_at, user_id, profile:profiles(nickname, photo_uri)')
    .eq('trial_id', trialId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    text: row.text,
    created_at: row.created_at,
    user_id: row.user_id,
    nickname: row.profile?.nickname ?? null,
    photo_uri: row.profile?.photo_uri ?? null,
  }));
}

// ── 쓰기: 댓글 등록 (rpc add_comment) ───────────────────────────────
export async function addComment(trialId: number, text: string): Promise<void> {
  const { error } = await supabase.rpc('add_comment', {
    p_trial_id: trialId,
    p_text: text,
  });
  if (error) throw error;
}
