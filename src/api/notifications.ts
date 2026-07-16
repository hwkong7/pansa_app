import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/lib/types';

// ── 읽기: 내 알림 목록 ───────────────────────────────────────────
export async function listNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

// ── 읽기: 가장 최근의 안읽은 재판요청 알림 (홈 화면 배너용) ─────────
export async function getLatestUnreadTrialRequest(): Promise<AppNotification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'TRIAL_REQUEST')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as AppNotification) ?? null;
}

// ── 읽기: 안읽은 알림 개수 (종 아이콘 뱃지) ─────────────────────────
export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

// ── 쓰기: 알림 읽음 처리 ────────────────────────────────────────────
export async function markNotificationsRead(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.rpc('mark_notifications_read', { p_ids: ids });
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc('mark_all_notifications_read');
  if (error) throw error;
}

// ── 실시간 구독: 내 알림에 새 행이 생기면 콜백 (가이드 3-6) ─────────
export function subscribeNotifications(
  userId: string,
  onInsert: (n: AppNotification) => void
): () => void {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => onInsert(payload.new as AppNotification)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
