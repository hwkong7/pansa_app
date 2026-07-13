import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getMyTrialSettlement } from '@/api/profile';
import { getTrial } from '@/api/trials';
import { BottomBar, Button, Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import type { Trial } from '@/lib/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Verdict'>;

export default function VerdictScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { user } = useAuth();
  const [trial, setTrial] = useState<Trial | null>(null);
  const [settlement, setSettlement] = useState<{ betAmount: number; payout: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await getTrial(id);
        setTrial(t);
        if (user) {
          const s = await getMyTrialSettlement(user.id, id);
          setSettlement(s);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  if (loading || !trial) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const category = trial.title.match(/^\[(.+?)\]/)?.[1];
  const winnerText =
    trial.winner === 'A' ? '원고 승' : trial.winner === 'B' ? '피고 승' : '무승부';
  const totalVotes = trial.total_votes ?? (trial.votes_a ?? 0) + (trial.votes_b ?? 0);
  const winVotes =
    trial.winner === 'A' ? trial.votes_a ?? 0 : trial.winner === 'B' ? trial.votes_b ?? 0 : 0;
  const percent = totalVotes > 0 ? Math.round((winVotes / totalVotes) * 100) : 0;

  return (
    <Screen>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="chevron-right" size={26} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
        <Text style={styles.topTitle}>최종판결</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.container}>
        <Text style={styles.caseNo}>
          CASE {trial.id}
          {category ? `  ${category}` : ''}
        </Text>

        <Card bg={colors.white} style={styles.verdictCard}>
          <Text style={styles.verdictLabel}>최종판결</Text>
          <Text style={styles.verdictBig}>{winnerText}</Text>
          {trial.winner && (
            <Text style={styles.verdictSub}>
              배심원 {percent}% 찬성 · {totalVotes}표
            </Text>
          )}
        </Card>

        <View style={styles.banner}>
          <Text style={styles.bannerText}>ⓘ 배심원 판결이 확정되었습니다</Text>
        </View>

        <Text style={styles.sectionLabel}>P-COIN 정산</Text>

        {settlement ? (
          <>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>내 베팅액</Text>
              <Text style={[styles.rowValue, { color: colors.danger }]}>
                -{settlement.betAmount.toLocaleString()}P
              </Text>
            </View>
            <View style={styles.dashed} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.text, fontWeight: '700' }]}>
                내 배당
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  styles.payout,
                  { color: settlement.payout > 0 ? colors.primary : colors.textMuted },
                ]}
              >
                {settlement.payout > 0 ? '+' : ''}
                {settlement.payout.toLocaleString()}P
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.noBet}>이 재판에는 베팅하지 않았어요.</Text>
        )}
      </View>

      <BottomBar>
        <Button
          title="다른 재판 둘러보기"
          onPress={() => navigation.navigate('Tabs', { screen: 'Trials' })}
        />
      </BottomBar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  back: { fontSize: 30, color: colors.text },
  topTitle: { fontSize: font.h3, fontWeight: '800', color: colors.text },
  container: { flex: 1, padding: spacing.lg },
  caseNo: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  verdictCard: {
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
    paddingVertical: spacing.xl,
    alignItems: 'flex-start',
  },
  verdictLabel: { color: colors.textMuted, fontSize: font.small },
  verdictBig: { fontSize: 40, fontWeight: '800', color: colors.text, marginVertical: 6 },
  verdictSub: { color: colors.textMuted, fontSize: font.small },
  banner: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  bannerText: { color: colors.textSubtle, fontWeight: '600', fontSize: font.small },
  sectionLabel: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowLabel: { color: colors.textMuted, fontSize: font.body },
  rowValue: { fontWeight: '700', fontSize: font.body },
  payout: { fontSize: font.h3 },
  dashed: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderStyle: 'dashed',
  },
  noBet: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.md },
  bottom: { padding: spacing.lg },
});
