import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { listMyBets, type MyBetRow } from '@/api/bets';
import { listMyComments, type MyCommentRow } from '@/api/comments';
import { getMyCoin, getMyLedger } from '@/api/profile';
import { cancelTrial, listMyTrials, updateTrialCategory } from '@/api/trials';
import { Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import type { CoinLedgerEntry, Trial } from '@/lib/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

const CATEGORIES = ['연애', '학업', '직장', '가족', '친구', '기타'];

type Props = NativeStackScreenProps<AppStackParamList, 'Activity'>;

const TITLES = {
  myTrials: '내 사연 내역',
  myComments: '내 댓글 내역',
  myBets: '배팅 내역',
  wallet: 'P-COIN 지갑',
} as const;

export default function ActivityScreen({ navigation, route }: Props) {
  const { mode } = route.params;
  const { user } = useAuth();

  const [trials, setTrials] = useState<Trial[]>([]);
  const [comments, setComments] = useState<MyCommentRow[]>([]);
  const [bets, setBets] = useState<MyBetRow[]>([]);
  const [ledger, setLedger] = useState<CoinLedgerEntry[]>([]);
  const [coin, setCoin] = useState(0);
  const [categoryPickerId, setCategoryPickerId] = useState<number | null>(null);

  const loadTrials = useCallback(() => {
    if (!user) return;
    listMyTrials(user.id).then(setTrials).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (mode === 'myTrials') loadTrials();
    if (mode === 'myComments') listMyComments(user.id).then(setComments).catch(() => {});
    if (mode === 'myBets') listMyBets().then(setBets).catch(() => {});
    if (mode === 'wallet') {
      getMyCoin(user.id).then(setCoin).catch(() => {});
      getMyLedger(user.id).then(setLedger).catch(() => {});
    }
  }, [mode, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDeleteTrial = (trial: Trial) => {
    Alert.alert(
      '사연 삭제',
      trial.status === 'OPEN'
        ? '이 사연을 삭제할까요? 원고/피고 판돈과 이미 걸린 베팅이 전원 환불돼요.'
        : '이 사연을 삭제할까요? 판돈은 바로 환불돼요.',
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '삭제하기',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelTrial(trial.id);
              loadTrials();
            } catch (e: any) {
              Alert.alert('오류', e?.message ?? '삭제에 실패했어요'); // 서버 메시지 그대로
            }
          },
        },
      ]
    );
  };

  const onPickCategory = async (category: string) => {
    if (categoryPickerId == null) return;
    try {
      await updateTrialCategory(categoryPickerId, category);
      setCategoryPickerId(null);
      loadTrials();
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '카테고리 수정에 실패했어요'); // 서버 메시지 그대로
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
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
            <MyTrialRow
              trial={item}
              onPress={() => navigation.navigate('TrialDetail', { id: item.id })}
              onEditCategory={() => setCategoryPickerId(item.id)}
              onDelete={
                item.status === 'PENDING' || item.status === 'OPEN'
                  ? () => onDeleteTrial(item)
                  : undefined
              }
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>작성한 사연이 없어요.</Text>}
        />
      )}

      <Modal
        visible={categoryPickerId != null}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerId(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoryPickerId(null)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>카테고리 수정</Text>
            {CATEGORIES.map((c) => (
              <Pressable key={c} style={styles.modalOption} onPress={() => onPickCategory(c)}>
                <Text style={styles.modalOptionText}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {mode === 'myComments' && (
        <FlatList
          data={comments}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card
              bg={colors.white}
              style={styles.row}
              onPress={() => navigation.navigate('TrialDetail', { id: item.trial.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.trial.title}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.text}
                </Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={<Text style={styles.empty}>작성한 댓글이 없어요.</Text>}
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
                    {item.trial.title}
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

// 내 사연 내역 한 줄: 왼쪽으로 스와이프하면 삭제 버튼이 드러난다(PENDING/OPEN만 삭제 가능).
// 카테고리 배지를 누르면 분류를 잘못 골랐을 때 바로잡을 수 있다.
function MyTrialRow({
  trial,
  onPress,
  onEditCategory,
  onDelete,
}: {
  trial: Trial;
  onPress: () => void;
  onEditCategory: () => void;
  onDelete?: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);

  const row = (
    <Card bg={colors.white} style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Pressable onPress={onEditCategory} hitSlop={6} style={styles.categoryRow}>
          {trial.category && <Text style={styles.categoryTag}>{trial.category}</Text>}
          <Icon name="settings" size={12} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {trial.title}
        </Text>
        <Text style={styles.rowMeta}>
          {statusLabel(trial.status)} · 판돈 {trial.stake.toLocaleString()}P
        </Text>
      </View>
      <StatusBadge status={trial.status} />
    </Card>
  );

  if (!onDelete) return row;

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <Pressable
          style={styles.deleteAction}
          onPress={() => {
            swipeRef.current?.close();
            onDelete();
          }}
        >
          <Text style={styles.deleteActionText}>사연 삭제</Text>
        </Pressable>
      )}
    >
      {row}
    </Swipeable>
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
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  categoryTag: { fontSize: font.tiny, color: colors.primary, fontWeight: '700' },
  deleteAction: {
    width: 88,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionText: { color: colors.white, fontWeight: '700', fontSize: font.small },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(21,27,46,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  modalOption: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  modalOptionText: { fontSize: font.body, color: colors.text, fontWeight: '600' },
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
