import { supabase } from '@/lib/supabase';
import type { Notification } from '@/lib/types';

/**
 * 알림 API. 백엔드 확정 스키마(팀원 확인):
 *   notifications (
 *     id bigint primary key generated always as identity,
 *     user_id uuid references auth.users(id) on delete cascade,
 *     type text,   -- TRIAL_REQUEST | TRIAL_STARTED | BET | RESULT | BET_SETTLED
 *     title text,
 *     body text,
 *     trial_id bigint references trials(id) on delete cascade,
 *     is_read boolean default false,
 *     created_at timestamptz default now()
 *   )
 * 자동 생성 트리거(DB 쪽, 백엔드 구현):
 *   - 재판 생성(PENDING) → 피고에게 TRIAL_REQUEST
 *   - 피고 수락(OPEN) → 원고에게 TRIAL_STARTED
 *   - 참관인 베팅 완료 → 원고와 피고 모두에게 BET
 *   - 재판 마감(SETTLED) → 당사자들에게 RESULT, 베팅 참여자 전원에게 BET_SETTLED
 *
 * 배포 시점 차이를 대비해 조회 실패(테이블 아직 없음 등) 시 조용히 빈 배열로 폴백한다.
 */

export async function listNotifications(userId: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Notification[];
  } catch {
    // 테이블이 아직 없거나(42P01) 그 외 이유로 조회가 안 되면 빈 목록으로 처리
    return [];
  }
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const list = await listNotifications(userId);
  return list.filter((n) => !n.is_read).length;
}

// NOTE: 읽음 처리는 내 소유 row 하나만 바꾸는 것이라 우선 직접 update로 구현한다.
// 백엔드가 RPC(mark_notification_read 등)를 원하면 이 함수만 교체하면 됨.
export async function markNotificationRead(id: number): Promise<void> {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  } catch {
    // 테이블 없을 때는 조용히 무시
  }
}
