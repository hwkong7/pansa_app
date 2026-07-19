import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { unreadNotificationCount } from '@/api/notifications';
import { getMyProfile } from '@/api/profile';
import { listMyTrials, listTrials } from '@/api/trials';
import { Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { useAttendance } from '@/lib/attendance';
import { DEMO_MODE, demoGetComments } from '@/lib/demo';
import type { Profile, Trial } from '@/lib/types';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<AppStackParamList>
>;

type BestPeriod = 'day' | 'week' | 'month';
const BEST_PERIODS: { key: BestPeriod; label: string; ms: number }[] = [
  { key: 'day', label: '일간', ms: 86_400_000 },
  { key: 'week', label: '주간', ms: 7 * 86_400_000 },
  { key: 'month', label: '월간', ms: 30 * 86_400_000 },
];

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [openTrials, setOpenTrials] = useState<Trial[]>([]);
  const [settled, setSettled] = useState<Trial[]>([]);
  const [myPending, setMyPending] = useState<Trial[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bestPeriod, setBestPeriod] = useState<BestPeriod>('day');
  const attendance = useAttendance();

  const load = useCallback(async () => {
    try {
      const [open, done] = await Promise.all([
        listTrials('OPEN'),
        listTrials('SETTLED'),
      ]);
      setOpenTrials(open);
      setSettled(done);
      if (user) {
        const mine = await listMyTrials(user.id);
        setMyPending(mine.filter((t) => t.status === 'PENDING'));
        setUnreadCount(await unreadNotificationCount(user.id));
        setProfile(await getMyProfile(user.id));
      }
    } catch {
      // 홈 위젯은 조용히 무시
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const nickname =
    profile?.nickname ?? (user?.user_metadata?.nickname as string) ?? '익명의판사';
  const hottest = openTrials[0];

  // 베스트 판결: 선택 기간 내 정산된 재판 중 참여 투표수 → 베팅액 순으로 랭킹
  const best = useMemo(() => {
    const windowMs = BEST_PERIODS.find((p) => p.key === bestPeriod)!.ms;
    const inWindow = settled.filter((t) => {
      const settledAt = t.closes_at ? new Date(t.closes_at).getTime() : null;
      return settledAt != null && Date.now() - settledAt <= windowMs;
    });
    const pool = inWindow.length > 0 ? inWindow : settled;
    return [...pool].sort((a, b) => {
      const votes = (b.total_votes ?? 0) - (a.total_votes ?? 0);
      if (votes !== 0) return votes;
      return (b.total_bet ?? 0) - (a.total_bet ?? 0);
    })[0];
  }, [settled, bestPeriod]);

  // 피고인 동의 대기: 내가 쓴 사연 중 가장 오래 기다린 PENDING 건, 24시간 응답 창 기준 게이지
  const CONSENT_WINDOW_MS = 24 * 3_600_000;
  const waitingTrial = myPending[0];
  const waitingProgress = waitingTrial
    ? Math.min((Date.now() - new Date(waitingTrial.created_at).getTime()) / CONSENT_WINDOW_MS, 1)
    : 0;
  const waitingHoursLeft = waitingTrial
    ? Math.max(0, Math.ceil((CONSENT_WINDOW_MS - (Date.now() - new Date(waitingTrial.created_at).getTime())) / 3_600_000))
    : 0;

  const onCheckIn = async () => {
    const r = await attendance.checkIn();
    if (r.ok) Alert.alert('출석 완료', `+${r.reward}P 적립됐어요!`);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>
            안녕하세요,{'\n'}
            <Text style={styles.name}>{nickname}</Text>님
          </Text>
          <Pressable onPress={() => navigation.navigate('Notifications')} hitSlop={10}>
            <Icon name="bell" size={24} color={colors.text} />
            {unreadCount > 0 && <View style={styles.unreadBadge} />}
          </Pressable>
        </View>

        {/* 출석체크: 하루 1회, 누르면 채워지고 저장됨 */}
        <Card style={styles.attendance}>
          <View style={styles.attRow}>
            <Text style={styles.attLabel}>
              {attendance.streak > 0 ? `출석체크 ${attendance.streak}일째` : '출석체크'}
            </Text>
            <Text style={styles.attReward}>
              +{attendance.reward}
              <Text style={styles.attP}>P</Text>
            </Text>
          </View>
          <View style={styles.progressTrack}>
            {Array.from({ length: attendance.segments }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSeg,
                  i < attendance.filled && { backgroundColor: colors.primary },
                ]}
              />
            ))}
          </View>
          <Pressable
            onPress={onCheckIn}
            disabled={attendance.checkedToday}
            style={[styles.attBtn, attendance.checkedToday && styles.attBtnDone]}
          >
            <Text
              style={[
                styles.attBtnText,
                attendance.checkedToday && { color: colors.textMuted },
              ]}
            >
              {attendance.checkedToday ? '오늘 출석 완료 ✓' : '출석체크하기'}
            </Text>
          </Pressable>
        </Card>

        {waitingTrial && (
          <Card style={styles.widget}>
            <Text style={styles.widgetLabel}>피고인 동의 대기중</Text>
            <Text style={styles.widgetTitle} numberOfLines={1}>
              {stripCategory(waitingTrial.title)}
            </Text>
            <View style={styles.consentTrack}>
              <View style={[styles.consentFill, { width: `${waitingProgress * 100}%` }]} />
            </View>
            <Text style={styles.widgetMeta}>
              {waitingHoursLeft > 0
                ? `응답 대기 · ${waitingHoursLeft}시간 남음`
                : '응답 대기 · 곧 자동 취소돼요'}
            </Text>
          </Card>
        )}

        {hottest && (
          <Card
            style={styles.widget}
            onPress={() => navigation.navigate('TrialDetail', { id: hottest.id })}
          >
            <Text style={styles.widgetLabel}>실시간 인기재판</Text>
            <Text style={styles.widgetTitle} numberOfLines={1}>
              {stripCategory(hottest.title)}
            </Text>
            <Text style={styles.widgetMeta}>
              진행중 · 조회 {hottest.view_count ?? 0} · 댓글 {commentCount(hottest.id)}
            </Text>
          </Card>
        )}

        {best && (
          <Card style={styles.widget}>
            <View style={styles.bestHeaderRow}>
              <Text style={styles.widgetLabel}>베스트 판결</Text>
              <View style={styles.bestTabs}>
                {BEST_PERIODS.map((p) => (
                  <Pressable key={p.key} onPress={() => setBestPeriod(p.key)}>
                    <Text style={[styles.bestTab, bestPeriod === p.key && styles.bestTabActive]}>
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable onPress={() => navigation.navigate('Verdict', { id: best.id })}>
              <Text style={styles.widgetTitle} numberOfLines={1}>
                {stripCategory(best.title)}
              </Text>
              <Text style={[styles.widgetMeta, { color: colors.primary }]}>
                {best.winner === 'A' ? '원고 승 확정' : best.winner === 'B' ? '피고 승 확정' : '무승부'}
              </Text>
              <Text style={styles.widgetMeta}>
                참여 {best.total_votes ?? 0} · 베팅 {(best.total_bet ?? 0).toLocaleString()}P · 조회{' '}
                {best.view_count ?? 0} · 댓글 {commentCount(best.id)}
              </Text>
            </Pressable>
          </Card>
        )}

        <Card
          style={styles.linkRow}
          bg={colors.white}
          onPress={() => navigation.navigate('Trials')}
        >
          <Text style={styles.linkText}>진행중인 재판 바로가기</Text>
          <Icon name="chevron-right" size={20} color={colors.text} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function stripCategory(title: string) {
  return title.replace(/^\[.+?\]\s*/, '');
}

// 데모: 댓글은 세션 동안만 저장되는 목업이라 DEMO_MODE에서만 집계
function commentCount(trialId: number) {
  return DEMO_MODE ? demoGetComments(trialId).length : 0;
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  greeting: { fontSize: font.h2, color: colors.text, lineHeight: 30 },
  name: { fontWeight: '800' },
  unreadBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  attendance: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  attRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  attLabel: { color: colors.textMuted, fontSize: font.body },
  attReward: { fontSize: font.h1, fontWeight: '800', color: colors.text },
  attP: { fontSize: font.body, color: colors.primary },
  progressTrack: { flexDirection: 'row', gap: 6, marginTop: spacing.md },
  progressSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
  attBtn: {
    marginTop: spacing.md,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attBtnDone: { backgroundColor: colors.cardBg },
  attBtnText: { color: colors.white, fontWeight: '700', fontSize: font.body },
  widget: { marginBottom: spacing.md },
  widgetLabel: { color: colors.textMuted, fontSize: font.small, marginBottom: 4 },
  widgetTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  widgetMeta: { color: colors.textMuted, fontSize: font.small, marginTop: 4 },
  consentTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  consentFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  bestHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bestTabs: { flexDirection: 'row', gap: spacing.sm },
  bestTab: { fontSize: font.tiny, color: colors.textMuted, fontWeight: '700' },
  bestTabActive: { color: colors.primary },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderRadius: 0,
  },
  linkText: { color: colors.text, fontWeight: '700', fontSize: font.body },
});
