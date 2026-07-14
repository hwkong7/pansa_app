import { supabase } from '@/lib/supabase';
import { DEMO_MODE } from '@/lib/demo';
import type { Trial } from '@/lib/types';

export interface MyCommentRow {
  id: number;
  text: string;
  created_at: string;
  trial: Trial;
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
