import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { placeBet } from '@/api/bets';
import { buildInviteUrl, getTrial, subscribeTrial } from '@/api/trials';
import { BetSheet } from '@/components/BetSheet';
import { Button, Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { MIN_VOTES_TO_SETTLE, type Choice, type Trial } from '@/lib/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'TrialDetail'>;

const POLL_MS = 30_000;

export default function TrialDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [trial, setTrial] = useState<Trial | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const t = await getTrial(id);
      setTrial(t);
      return t;
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '재판을 불러오지 못했어요');
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const unsub = subscribeTrial(id, (t) => setTrial(t));
    pollRef.current = setInterval(load, POLL_MS);
    return () => {
      unsub();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, load]);

  // SETTLED/REJECTED 전환 시 결과 화면으로 이동
  useEffect(() => {
    if (!trial) return;
    if (trial.status === 'REJECTED') {
      navigation.replace('TrialCanceled', { trialId: trial.id });
    } else if (trial.status === 'SETTLED') {
      const total = trial.total_votes ?? (trial.votes_a ?? 0) + (trial.votes_b ?? 0);
      const isDraw = trial.winner == null;
      if (isDraw || total < MIN_VOTES_TO_SETTLE) {
        navigation.replace('VerdictFailed', { trialId: trial.id });
      } else {
        navigation.replace('Verdict', { id: trial.id });
      }
    }
  }, [trial?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !trial) {
    return (
      <Screen>
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const category = trial.title.match(/^\[(.+?)\]/)?.[1];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Icon name="chevron-right" size={26} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <Text style={styles.caseNo}>
            CASE {trial.id}
            {category ? `  ${category}` : ''}
          </Text>
        </View>

        <Text style={styles.story}>{trial.story}</Text>

        {trial.status === 'PENDING' && <PendingView trial={trial} navigation={navigation} />}
        {trial.status === 'OPEN' && <OpenView trial={trial} onBetPlaced={load} />}
      </ScrollView>
    </Screen>
  );
}

// ── PENDING: 상대방 수락 대기 + 초대 링크 공유 ────────────────────
function PendingView({
  trial,
  navigation,
}: {
  trial: Trial;
  navigation: NativeStackScreenProps<AppStackParamList, 'TrialDetail'>['navigation'];
}) {
  const inviteUrl = trial.invite_token ? buildInviteUrl(trial.invite_token) : null;
  return (
    <>
      <View style={styles.divider} />
      <Card style={styles.pendingCard}>
        <Icon name="hourglass" size={40} color={colors.primary} />
        <Text style={styles.pendingTitle}>상대방(피고) 수락 대기 중</Text>
        <Text style={styles.pendingSub}>
          24시간 내 응답이 없으면 자동 취소되고 판돈은 환불돼요.
        </Text>
        {inviteUrl && (
          <>
            <Text style={styles.inviteUrl} numberOfLines={1}>
              {inviteUrl}
            </Text>
            <Button
              title="동의요청 링크 복사"
              variant="outline"
              style={{ marginTop: spacing.md }}
              onPress={async () => {
              await Clipboard.setStringAsync(inviteUrl);
              if (trial.invite_token) {
                navigation.navigate('ConsentRequest', { token: trial.invite_token });
            }
  }}
/>
          </>
        )}
      </Card>
    </>
  );
}

// ── OPEN: 동의완료 + 투표진행 + 편선택 + 베팅 시트 ────────────────
function OpenView({
  trial,
  onBetPlaced,
}: {
  trial: Trial;
  onBetPlaced: () => void;
}) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const total = (trial.votes_a ?? 0) + (trial.votes_b ?? 0);
  const progress = Math.min(total / MIN_VOTES_TO_SETTLE, 1);
  const dday = trial.closes_at
    ? Math.max(0, Math.ceil((new Date(trial.closes_at).getTime() - Date.now()) / 86_400_000))
    : null;

  const openSheet = () => {
    if (!choice) {
      Alert.alert('선택 필요', '먼저 원고 승 / 피고 승 중 하나를 선택하세요.');
      return;
    }
    setSheetOpen(true);
  };

  const confirmBet = async (amount: number) => {
    try {
      await placeBet(trial.id, choice!, amount);
      setSheetOpen(false);
      Alert.alert('완료', '베팅이 접수됐어요. 결과는 마감 후 공개돼요.');
      onBetPlaced();
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '베팅에 실패했어요');
    }
  };

  return (
    <View>
      <Text style={styles.consentLine}>
        ✓ 피고인 동의 완료{dday != null ? ` · D-${dday}` : ''}
      </Text>

      <View style={styles.divider} />

      {/* 투표 진행 */}
      <View style={styles.rowBetween}>
        <Text style={styles.voteLabel}>투표 진행 (성립기준 {MIN_VOTES_TO_SETTLE}표)</Text>
        <Text style={styles.voteCount}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{total}</Text> /{' '}
          {MIN_VOTES_TO_SETTLE}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>

      {/* 블라인드 편 선택 */}
      <Text style={styles.blindNote}>블라인드 투표 · 결과는 마감 후 공개돼요</Text>
      <View style={styles.choiceRow}>
        <ChoiceButton
          label={trial.option_a || '원고 승'}
          active={choice === 'A'}
          onPress={() => setChoice('A')}
        />
        <ChoiceButton
          label={trial.option_b || '피고 승'}
          active={choice === 'B'}
          onPress={() => setChoice('B')}
        />
      </View>

      {/* P-COIN 베팅하기 (탭 → 하단 시트) */}
      <Pressable onPress={openSheet} style={styles.betRow}>
        <Text style={styles.betRowLabel}>P-COIN 베팅하기</Text>
        <Text style={styles.betRowHint}>최소 {trial.stake || 500}p ›</Text>
      </Pressable>

      <BetSheet
        visible={sheetOpen}
        trial={trial}
        choice={choice}
        onClose={() => setSheetOpen(false)}
        onConfirm={confirmBet}
      />
    </View>
  );
}

function ChoiceButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choiceBtn, active && styles.choiceBtnActive]}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 60 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: { fontSize: 30, color: colors.text, marginRight: 4 },
  caseNo: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  story: { fontSize: font.h3, color: colors.text, lineHeight: 26, marginTop: spacing.md },
  consentLine: { color: colors.success, fontSize: font.small, fontWeight: '700', marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  voteLabel: { color: colors.textSubtle, fontSize: font.small, fontWeight: '700' },
  voteCount: { color: colors.textMuted, fontSize: font.h3 },
  track: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: spacing.sm, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },

  blindNote: { color: colors.textMuted, fontSize: font.small, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  choiceRow: { flexDirection: 'row', gap: spacing.md },
  choiceBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  choiceBtnActive: { borderColor: colors.primary, backgroundColor: colors.cardBg },
  choiceText: { color: colors.text, fontWeight: '700', fontSize: font.body },
  choiceTextActive: { color: colors.primary },

  betRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  betRowLabel: { fontSize: font.h3, fontWeight: '800', color: colors.text },
  betRowHint: { fontSize: font.body, color: colors.textMuted },

  // pending
  pendingCard: { alignItems: 'center', paddingVertical: spacing.xl },
  pendingIcon: { fontSize: 40 },
  pendingTitle: { fontSize: font.h3, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  pendingSub: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, fontSize: font.small },
  inviteUrl: { color: colors.primary, marginTop: spacing.lg, fontSize: font.small },
});
