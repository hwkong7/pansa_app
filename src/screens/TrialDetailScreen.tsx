import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { placeBet } from '@/api/bets';
import { buildInviteUrl, endTrialDemo, getTrial, incrementTrialView, subscribeTrial } from '@/api/trials';
import { BetSheet } from '@/components/BetSheet';
import { Button, Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import {
  DEMO_MODE,
  demoAddComment,
  demoGetComments,
  type DemoComment,
} from '@/lib/demo';
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

  // 조회수 +1: 화면 진입 시 1회만
  useEffect(() => {
    incrementTrialView(id).catch(() => {});
  }, [id]);

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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Icon name="chevron-right" size={26} color={colors.text} style={styles.backIcon} />
          </Pressable>
          <Text style={styles.caseNo}>
            CASE {trial.id}
            {category ? `  ${category}` : ''}
          </Text>
        </View>

        <Text style={styles.story}>{trial.story}</Text>

        {/* 첨부 사진 */}
        {trial.photo_uri ? (
          <Image source={{ uri: trial.photo_uri }} style={styles.photo} resizeMode="cover" />
        ) : null}

        {/* 댓글 (데모) */}
        {DEMO_MODE && <CommentsSection trialId={trial.id} />}
        {trial.status === 'PENDING' && (
          <PendingView trial={trial} navigation={navigation} />
        )}
        {trial.status === 'OPEN' && <OpenView trial={trial} onBetPlaced={load} />}
      </ScrollView>
    </Screen>
  );
}

// ── PENDING: 상대방 수락 대기 + 초대 링크 공유 ────────────────────
// function PendingView({
//   trial,
//   navigation,
// }: {
//   trial: Trial;
//   navigation: Props['navigation'];
// }) {
function PendingView({
  trial,
  navigation,
}: {
  trial: Trial;
  navigation: Props['navigation'];
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
                // // 복사 후 피고 동의요청 화면으로 이동
                // if (trial.invite_token) {
                //   navigation.navigate('ConsentRequest', { token: trial.invite_token });
                // }
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}

// ── OPEN: 동의완료 + 투표진행 + 편선택 + 베팅 시트 + 재판 끝내기 ──
function OpenView({ trial, onBetPlaced }: { trial: Trial; onBetPlaced: () => void }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  const total = (trial.votes_a ?? 0) + (trial.votes_b ?? 0);
  const progress = Math.min(total / MIN_VOTES_TO_SETTLE, 1);
  const full = total >= MIN_VOTES_TO_SETTLE; // 투표 정원 도달
  const dday = trial.closes_at
    ? Math.max(0, Math.ceil((new Date(trial.closes_at).getTime() - Date.now()) / 86_400_000))
    : null;

  const openSheet = () => {
    if (full) {
      Alert.alert('투표 마감', '투표 정원이 찼어요. 재판을 끝내주세요.');
      return;
    }
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
      onBetPlaced();
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '베팅에 실패했어요');
    }
  };

  // 재판 끝내기(데모): 과반 판정 → 상태 변경 후 새로고침 → 상위 effect가 결과화면 이동
  const endTrial = async () => {
    setEnding(true);
    try {
      // 과반 판정 후 상태 변경 → onBetPlaced()로 새로고침 → 상위 effect가 결과 화면으로 이동
      await endTrialDemo(trial.id);
      onBetPlaced();
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '재판을 끝내지 못했어요');
      setEnding(false);
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
      {full && <Text style={styles.fullNote}>투표 정원이 찼어요. 아래에서 재판을 끝내주세요.</Text>}

      {/* 블라인드 편 선택 */}
      <Text style={styles.blindNote}>블라인드 투표 · 결과는 마감 후 공개돼요</Text>
      <View style={styles.choiceRow}>
        <ChoiceButton
          label={trial.option_a || '원고 승'}
          active={choice === 'A'}
          disabled={full}
          onPress={() => setChoice('A')}
        />
        <ChoiceButton
          label={trial.option_b || '피고 승'}
          active={choice === 'B'}
          disabled={full}
          onPress={() => setChoice('B')}
        />
      </View>

      {/* P-COIN 베팅하기 */}
      <Pressable onPress={openSheet} style={[styles.betRow, full && { opacity: 0.4 }]}>
        <Text style={styles.betRowLabel}>P-COIN 베팅하기</Text>
        <Text style={styles.betRowHint}>
          {full ? '투표 마감' : `최소 ${trial.stake || 500}p ›`}
        </Text>
      </Pressable>

      {/* 재판 끝내기 (데모) */}
      <Button
        title="재판 끝내기 (데모)"
        variant={full ? 'primary' : 'outline'}
        loading={ending}
        style={{ marginTop: spacing.lg }}
        onPress={endTrial}
      />
      <Text style={styles.endNote}>
        과반이면 원고/피고 승으로 확정, 과반이 아니거나 정원 미달이면 판결 성립 실패돼요.
      </Text>

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

// ── 댓글 섹션 (데모: 세션 동안만 저장) ────────────────────────────
function CommentsSection({ trialId }: { trialId: number }) {
  const [comments, setComments] = useState<DemoComment[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    setComments(demoGetComments(trialId));
  }, [trialId]);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    demoAddComment(trialId, t);
    setComments(demoGetComments(trialId));
    setText('');
  };

  return (
    <View style={styles.commentsWrap}>
      <View style={styles.divider} />
      <Text style={styles.commentsTitle}>댓글 {comments.length}</Text>

      {comments.map((c) => (
        <View key={c.id} style={styles.commentRow}>
          <View style={styles.commentAvatar}>
            <Icon name="mypage" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.commentNick}>{c.nickname}</Text>
            <Text style={styles.commentText}>{c.text}</Text>
          </View>
        </View>
      ))}

      {comments.length === 0 && (
        <Text style={styles.commentEmpty}>첫 댓글을 남겨보세요.</Text>
      )}

      <View style={styles.commentInputRow}>
        <TextInput
          style={styles.commentInput}
          value={text}
          onChangeText={setText}
          placeholder="댓글 달기..."
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={add}
          returnKeyType="send"
        />
        <Pressable onPress={add} style={styles.commentSend}>
          <Text style={styles.commentSendText}>등록</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ChoiceButton({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.choiceBtn,
        active && styles.choiceBtnActive,
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 60 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backIcon: { transform: [{ rotate: '180deg' }] },
  caseNo: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  story: { fontSize: font.h3, color: colors.text, lineHeight: 26, marginTop: spacing.md },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    backgroundColor: colors.cardBg,
  },
  consentLine: { color: colors.success, fontSize: font.small, fontWeight: '700', marginTop: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  voteLabel: { color: colors.textSubtle, fontSize: font.small, fontWeight: '700' },
  voteCount: { color: colors.textMuted, fontSize: font.h3 },
  track: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: spacing.sm, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  fullNote: { color: colors.danger, fontSize: font.small, marginTop: spacing.sm, fontWeight: '600' },

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
  endNote: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing.sm, lineHeight: 16 },

  // pending
  pendingCard: { alignItems: 'center', paddingVertical: spacing.xl },
  pendingTitle: { fontSize: font.h3, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  pendingSub: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, fontSize: font.small },
  inviteUrl: { color: colors.primary, marginTop: spacing.lg, fontSize: font.small },

  // comments
  commentsWrap: {},
  commentsTitle: { fontSize: font.body, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  commentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'flex-start' },
  commentAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center',
  },
  commentNick: { fontSize: font.small, fontWeight: '700', color: colors.text },
  commentText: { fontSize: font.body, color: colors.text, marginTop: 2, lineHeight: 20 },
  commentEmpty: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.md },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm,
  },
  commentInput: {
    flex: 1, height: 44, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, color: colors.text, fontSize: font.body,
  },
  commentSend: {
    height: 44, paddingHorizontal: spacing.md, borderRadius: radius.pill,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  commentSendText: { color: colors.white, fontWeight: '700', fontSize: font.small },
});