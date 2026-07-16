import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * 출석체크: 하루 한 번만 체크 가능. 마지막 체크 날짜/연속일수를 AsyncStorage에 저장.
 * ⚠️ 출석 보상은 안내문서/요청사항에 없는 기능이라 백엔드 RPC가 아직 없다.
 * 현재는 UI(연속일수/뱃지)만 로컬에 기록하고, 코인은 실제로 지급되지 않는다.
 */
const KEY = 'pansa:attendance';
const REWARD = 10;
const SEGMENTS = 5; // 표시용 progress 칸 수

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isYesterday(dateStr: string) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return dateStr === `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
}

export function useAttendance() {
  const [streak, setStreak] = useState(0);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const { streak: s, lastDate: d } = JSON.parse(raw);
          setStreak(s ?? 0);
          setLastDate(d ?? null);
        }
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const checkedToday = lastDate === todayStr();

  const checkIn = useCallback(async () => {
    if (checkedToday) return { ok: false, reward: 0 };

    // 어제 이어서 체크했으면 연속, 아니면 1일차로 리셋
    const nextStreak = lastDate && isYesterday(lastDate) ? streak + 1 : 1;
    const today = todayStr();

    setStreak(nextStreak);
    setLastDate(today);
    try {
      await AsyncStorage.setItem(
        KEY,
        JSON.stringify({ streak: nextStreak, lastDate: today })
      );
    } catch {
      // ignore
    }

    // 실제 백엔드 연동 시: 여기서 출석 보상 지급 RPC 를 호출하도록 교체
    return { ok: true, reward: REWARD };
  }, [checkedToday, lastDate, streak]);

  // 이번 주기에서 채워진 칸 수 (1~SEGMENTS 순환)
  const filled = streak === 0 ? 0 : ((streak - 1) % SEGMENTS) + 1;

  return { streak, filled, segments: SEGMENTS, checkedToday, checkIn, loaded, reward: REWARD };
}
