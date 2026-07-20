import { useCallback, useEffect, useState } from 'react';
import { dailyCheckin, getMyProfile } from '@/api/profile';
import { useAuth } from '@/context/AuthContext';

/**
 * 출석체크: 하루 한 번만 체크 가능. 서버(profiles.checkin_streak/last_checkin_at)가
 * 진실의 원천이라, 기기를 바꾸거나 앱을 재설치해도 스트릭이 유지되고 실제로 코인이
 * 지급된다(rpc daily_checkin).
 */
const SEGMENTS = 5; // 표시용 progress 칸 수

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function useAttendance() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [reward, setReward] = useState(10);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }
    getMyProfile(user.id)
      .then((p) => {
        setStreak(p.checkin_streak ?? 0);
        setLastDate(p.last_checkin_at ?? null);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [user]);

  const checkedToday = lastDate === todayStr();

  const checkIn = useCallback(async () => {
    if (checkedToday || !user) return { ok: false, reward: 0 };
    try {
      const result = await dailyCheckin();
      setStreak(result.streak);
      setReward(result.reward);
      setLastDate(todayStr());
      return { ok: true, reward: result.reward };
    } catch {
      return { ok: false, reward: 0 };
    }
  }, [checkedToday, user]);

  // 이번 주기에서 채워진 칸 수 (1~SEGMENTS 순환)
  const filled = streak === 0 ? 0 : ((streak - 1) % SEGMENTS) + 1;

  return { streak, filled, segments: SEGMENTS, checkedToday, checkIn, loaded, reward };
}
