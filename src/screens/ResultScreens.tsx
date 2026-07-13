import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getTrial } from '@/api/trials';
import { BottomBar, Button, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { MIN_VOTES_TO_SETTLE, type Trial } from '@/lib/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

// ── 3-4 재판 자동취소 (REJECTED) ─────────────────────────────────
export function TrialCanceledScreen({
  navigation,
}: NativeStackScreenProps<AppStackParamList, 'TrialCanceled'>) {
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Icon name="frown" size={44} color={colors.danger} />
          <Text style={styles.title}>재판이 자동 취소되었습니다</Text>
          <Text style={styles.sub}>동의 거절 혹은 응답 기한 초과</Text>
        </View>

        <Row label="사유" value="동의 거절 · 기한초과" />
        <Row label="베팅 P-COIN" value="전액 환불 완료" valueColor={colors.success} />
      </View>

      <BottomBar>
        <Button
          title="사연 수정 후 다시시도"
          onPress={() => navigation.navigate('CreateTrial')}
        />
      </BottomBar>
    </Screen>
  );
}

// ── 3-6 판결 성립 실패 (SETTLED, 10표 미만 또는 동률) ─────────────
export function VerdictFailedScreen({
  navigation,
  route,
}: NativeStackScreenProps<AppStackParamList, 'VerdictFailed'>) {
  const { trialId } = route.params;
  const [trial, setTrial] = useState<Trial | null>(null);

  useEffect(() => {
    getTrial(trialId).then(setTrial).catch(() => {});
  }, [trialId]);

  const total =
    trial?.total_votes ?? (trial?.votes_a ?? 0) + (trial?.votes_b ?? 0);

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.topTitle}>판결 성립 실패</Text>
        <View style={styles.hero}>
          <Icon name="alert" size={44} color={colors.warning} />
          <Text style={styles.title}>판결이 성립되지 않았습니다</Text>
          <Text style={styles.sub}>투표 {MIN_VOTES_TO_SETTLE}표 이하 또는 동률</Text>
        </View>

        <Row label="최종 투표 수" value={`${total}표`} />
        <Row label="게시물 상태" value="삭제 처리" />
        <Row label="베팅 P-COIN" value="전액 환불 완료" valueColor={colors.success} />
      </View>

      <BottomBar>
        <Button title="홈으로 돌아가기" onPress={() => navigation.popToTop()} />
      </BottomBar>
    </Screen>
  );
}

function Row({
  label,
  value,
  valueColor = colors.text,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  topTitle: {
    fontSize: font.h3,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  hero: { alignItems: 'center', marginVertical: spacing.xl },
  iconRed: { fontSize: 44 },
  iconWarn: { fontSize: 44 },
  title: { fontSize: font.h3, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  sub: { color: colors.textMuted, marginTop: spacing.xs, fontSize: font.small },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.textMuted, fontSize: font.body },
  rowValue: { fontWeight: '700', fontSize: font.body },
  bottom: { padding: spacing.lg },
});
