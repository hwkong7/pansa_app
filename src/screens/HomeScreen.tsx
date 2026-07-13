import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { listTrials } from '@/api/trials';
import { Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { useAttendance } from '@/lib/attendance';
import type { Trial } from '@/lib/types';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<AppStackParamList>
>;

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [openTrials, setOpenTrials] = useState<Trial[]>([]);
  const [settled, setSettled] = useState<Trial[]>([]);
  const attendance = useAttendance();

  const load = useCallback(async () => {
    try {
      const [open, done] = await Promise.all([
        listTrials('OPEN'),
        listTrials('SETTLED'),
      ]);
      setOpenTrials(open);
      setSettled(done);
    } catch {
      // 홈 위젯은 조용히 무시
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const nickname = (user?.user_metadata?.nickname as string) ?? '익명의판사';
  const hottest = openTrials[0];
  const best = settled.find((t) => t.winner) ?? settled[0];

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
          <Icon name="bell" size={24} color={colors.text} />
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

        {hottest && (
          <Card
            style={styles.widget}
            onPress={() => navigation.navigate('TrialDetail', { id: hottest.id })}
          >
            <Text style={styles.widgetLabel}>실시간 인기재판</Text>
            <Text style={styles.widgetTitle} numberOfLines={1}>
              {stripCategory(hottest.title)}
            </Text>
            <Text style={styles.widgetMeta}>진행중 · 상태 {hottest.status}</Text>
          </Card>
        )}

        {best && (
          <Card
            style={styles.widget}
            onPress={() => navigation.navigate('Verdict', { id: best.id })}
          >
            <Text style={styles.widgetLabel}>베스트 판결</Text>
            <Text style={styles.widgetTitle} numberOfLines={1}>
              {stripCategory(best.title)}
            </Text>
            <Text style={[styles.widgetMeta, { color: colors.primary }]}>
              {best.winner === 'A'
                ? '원고 승 확정'
                : best.winner === 'B'
                ? '피고 승 확정'
                : '무승부'}
            </Text>
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
