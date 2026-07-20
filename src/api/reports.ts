import { supabase } from '@/lib/supabase';

export type ReportTargetType = 'trial' | 'comment';

// ── 쓰기: 신고 (rpc report_content) ─────────────────────────────────
export async function reportContent(
  targetType: ReportTargetType,
  targetId: number,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc('report_content', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
  });
  if (error) throw error;
}
