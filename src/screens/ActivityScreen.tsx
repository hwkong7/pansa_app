import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { listMyBets, type MyBetRow } from '@/api/bets';
import { getMyCoin, getMyLedger } from '@/api/profile';
import { listMyTrials } from '@/api/trials';
import { Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import type { CoinLedgerEntry, Trial } from '@/lib/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Activity'>;

const TITLES = {
  myTrials: '내 사연 내역',
  myBets: '배팅 내역',
  wallet: 'P-COIN 지갑',
} as const;

export default function ActivityScreen({ navigation, route }: Props) {
  const { mode } = route.params;
  const { user } = useAuth();

  const [trials, setTrials] = useState<Trial[]>([]);
  const [bets, setBets] = useState<MyBetRow[]>([]);
  const [ledger, setLedger] = useState<CoinLedgerEntry[]>([]);
  const [coin, setCoin] = useState(0);

  useEffect(() => {
    if (!user) return;
    if (mode === 'myTrials') listMyTrials(user.id).then(setTrials).catch(() => {});
    if (mode === 'myBets') listMyBets().then(setBets).catch(() => {});
    if (mode === 'wallet') {
      getMyCoin(user.id).then(setCoin).catch(() => {});
      getMyLedger(user.id).then(setLedger).catch(() => {});
    }
  }, [mode, user]);

  return (
    <Screen>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="chevron-right" size={26} color={colors.text} style={styles.back} />
        </Pressable>
        <Text style={styles.topTitle}>{TITLES[mode]}</Text>
        <View style={{ width: 26 }} />
      </View>

      {mode === 'wallet' && (
        <Card style={styles.walletCard}>
          <Text style={styles.walletLabel}>보유 P-COIN</Text>
          <Text style={styles.walletValue}>{coin.toLocaleString()}P</Text>
        </Card>
      )}

      {mode === 'myTrials' && (
        <FlatList
          data={trials}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card
              bg={colors.white}
              style={styles.row}
              onPress={() => navigation.navigate('TrialDetail', { id: item.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title.replace(/^\[.+?\]\s*/, '')}
                </Text>
                <Text style={styles.rowMeta}>
                  {statusLabel(item.status)} · 판돈 {item.stake.toLocaleString()}P
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </Card>
          )}
          ListEmptyComponent={<Text style={styles.empty}>작성한 사연이 없어요.</Text>}
        />
      )}

      {mode === 'myBets' && (
        <FlatList
          data={bets}
          keyExtractor={(b) => String(b.trial.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const win = item.settled && item.payout > 0;
            const resultText = !item.settled
              ? '진행중'
              : win
              ? `+${item.payout.toLocaleString()}P`
              : `-${item.amount.toLocaleString()}P`;
            const resultColor = !item.settled
              ? colors.textMuted
              : win
              ? colors.primary
              : colors.danger;
            return (
              <Card
                bg={colors.white}
                style={styles.row}
                onPress={() =>
                  navigation.navigate(
                    item.settled ? 'Verdict' : 'TrialDetail',
                    { id: item.trial.id } as any
                  )
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.trial.title.replace(/^\[.+?\]\s*/, '')}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {item.choice === 'A' ? item.trial.option_a : item.trial.option_b} 에{' '}
                    {item.amount.toLocaleString()}P
                  </Text>
                </View>
                <View style={styles.betResultCol}>
                  <Text style={[styles.settleBadge, { color: item.settled ? colors.success : colors.textMuted }]}>
                    {item.settled ? '정산 완료' : '정산 대기'}
                  </Text>
                  <Text style={[styles.result, { color: resultColor }]}>{resultText}</Text>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>배팅 내역이 없어요.</Text>}
        />
      )}

      {mode === 'wallet' && (
        <FlatList
          data={ledger}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.sectionLabel}>코인 내역</Text>}
          renderItem={({ item }) => (
            <View style={styles.ledgerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ledgerReason}>{item.reason ?? '내역'}</Text>
                <Text style={styles.ledgerDate}>{formatDate(item.created_at)}</Text>
              </View>
              <Text
                style={[
                  styles.ledgerAmount,
                  { color: item.amount >= 0 ? colors.primary : colors.danger },
                ]}
              >
                {item.amount >= 0 ? '+' : ''}
                {item.amount.toLocaleString()}P
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>코인 내역이 없어요.</Text>}
        />
      )}
    </Screen>
  );
}

function statusLabel(s: Trial['status']) {
  return s === 'PENDING'
    ? '수락 대기'
    : s === 'OPEN'
    ? '투표 진행중'
    : s === 'SETTLED'
    ? '판결 완료'
    : '취소됨';
}

function StatusBadge({ status }: { status: Trial['status'] }) {
  const color =
    status === 'OPEN' ? colors.primary : status === 'SETTLED' ? colors.success : colors.textMuted;
  return <Text style={[styles.badge, { color }]}>{statusLabel(status)}</Text>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  back: { transform: [{ rotate: '180deg' }] },
  topTitle: { fontSize: font.h3, fontWeight: '800', color: colors.text },
  walletCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  walletLabel: { color: colors.textSubtle, fontSize: font.small },
  walletValue: { color: colors.primary, fontSize: font.h1, fontWeight: '800', marginTop: 4 },
  list: { padding: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  badge: { fontSize: font.small, fontWeight: '700' },
  betResultCol: { alignItems: 'flex-end' },
  settleBadge: { fontSize: font.tiny, fontWeight: '700', marginBottom: 2 },
  result: { fontSize: font.body, fontWeight: '800' },
  sectionLabel: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.sm },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ledgerReason: { fontSize: font.body, color: colors.text, fontWeight: '600' },
  ledgerDate: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  ledgerAmount: { fontSize: font.body, fontWeight: '800' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
