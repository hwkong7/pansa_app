import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { placeBet } from '@/api/bets';
import { addComment, listComments } from '@/api/comments';
import { getTrial, incrementTrialView, subscribeTrial } from '@/api/trials';
import { BetSheet } from '@/components/BetSheet';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { getTrialPhotos, MIN_VOTES_TO_SETTLE, type Choice, type Comment, type Trial } from '@/lib/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'TrialDetail'>;

const POLL_MS = 30_000;

export default function TrialDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [trial, setTrial] = useState<Trial | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 댓글: 입력창을 ScrollView 밖(키보드 위에 항상 떠 있는 하단 바)으로 빼서
  // 키보드가 올라와도 입력창이 가려지지 않게 한다.
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  const loadComments = useCallback(() => {
    listComments(id).then(setComments).catch(() => {});
  }, [id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const addCommentNow = async () => {
    const t = commentText.trim();
    if (!t || posting) return;
    setPosting(true);
    try {
      await addComment(id, t);
      setCommentText('');
      loadComments();
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '댓글 등록에 실패했어요');
    } finally {
      setPosting(false);
    }
  };

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

  // PENDING/SETTLED/REJECTED 전환 시 알맞은 화면으로 이동
  useEffect(() => {
    if (!trial) return;
    if (trial.status === 'PENDING') {
      navigation.replace('TrialPending', { id: trial.id });
    } else if (trial.status === 'REJECTED') {
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
  const photos = getTrialPhotos(trial);

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* 첨부 사진: 눌러서 전체화면으로 보기 */}
          {photos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoRow}
              contentContainerStyle={styles.photoRowContent}
            >
              {photos.map((uri, i) => (
                <Pressable
                  key={`${uri}-${i}`}
                  onPress={() => {
                    setViewerIndex(i);
                    setViewerOpen(true);
                  }}
                >
                  <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          )}

          {trial.status === 'OPEN' && <OpenView trial={trial} onBetPlaced={load} />}
          <CommentsList comments={comments} />
        </ScrollView>

        {/* 댓글 입력창: 스크롤 영역 밖(키보드 바로 위)에 항상 떠 있어 키보드에 가려지지 않는다 */}
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="댓글 달기..."
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={addCommentNow}
            returnKeyType="send"
            editable={!posting}
          />
          <Pressable
            onPress={addCommentNow}
            style={[styles.commentSend, posting && { opacity: 0.5 }]}
            disabled={posting}
          >
            <Text style={styles.commentSendText}>등록</Text>
          </Pressable>
        </View>

        <ImageViewerModal
          visible={viewerOpen}
          images={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ── OPEN: 동의완료 + 투표진행 + 편선택 + 베팅 시트 + 재판 끝내기 ──
function OpenView({ trial, onBetPlaced }: { trial: Trial; onBetPlaced: () => void }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const total = (trial.votes_a ?? 0) + (trial.votes_b ?? 0);
  const progress = Math.min(total / MIN_VOTES_TO_SETTLE, 1);
  const full = total >= MIN_VOTES_TO_SETTLE; // 투표 정원 도달
  const dday = trial.closes_at
    ? Math.max(0, Math.ceil((new Date(trial.closes_at).getTime() - Date.now()) / 86_400_000))
    : null;

  const openSheet = () => {
    if (full) {
      Alert.alert('투표 마감', '투표 정원이 찼어요. 마감/정산은 서버가 자동으로 처리해요.');
      return;
    }
    if (!choice) {
      Alert.alert('선택 필요', '먼저 원고 승 / 피고 승 중 하나를 선택하세요.');
      return;
    }
    setSheetOpen(true);
  };

  // 성공/실패 알림과 "처리 중이에요 → 베팅완료" 상태 전환은 BetSheet가 직접
  // 관리한다(연타로 인한 코인 이중 차감 방지 UI). 여기서는 실패 시 그대로
  // 에러를 던져서 BetSheet가 알 수 있게 한다.
  const confirmBet = async (amount: number) => {
    await placeBet(trial.id, choice!, amount);
    onBetPlaced();
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
      {full && <Text style={styles.fullNote}>투표 정원이 찼어요. 마감/정산은 서버가 자동으로 처리해요.</Text>}

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

      <Text style={styles.endNote}>
        마감/정산은 서버가 자동으로 처리해요. 과반이면 원고/피고 승으로 확정, 과반이 아니거나
        정원 미달이면 판결 성립 실패돼요.
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

// ── 댓글 목록 (입력창은 화면 하단에 별도로 떠 있음 — 키보드 회피용) ──
function CommentsList({ comments }: { comments: Comment[] }) {
  return (
    <View style={styles.commentsWrap}>
      <View style={styles.divider} />
      <Text style={styles.commentsTitle}>댓글 {comments.length}</Text>

      {comments.map((c) => (
        <View key={c.id} style={styles.commentRow}>
          <View style={styles.commentAvatar}>
            {c.author?.photo_uri ? (
              <Image source={{ uri: c.author.photo_uri }} style={styles.commentAvatarImg} />
            ) : (
              <Icon name="mypage" size={16} color={colors.primary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.commentNick}>{c.author?.nickname ?? '익명의판사'}</Text>
            <Text style={styles.commentText}>{c.text}</Text>
          </View>
        </View>
      ))}

      {comments.length === 0 && (
        <Text style={styles.commentEmpty}>첫 댓글을 남겨보세요.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 60 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backIcon: { transform: [{ rotate: '180deg' }] },
  caseNo: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  story: { fontSize: font.h3, color: colors.text, lineHeight: 26, marginTop: spacing.md },
  photoRow: { marginTop: spacing.md },
  photoRowContent: { gap: spacing.sm },
  photo: {
    width: 160,
    height: 160,
    borderRadius: radius.lg,
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

  // comments
  commentsWrap: {},
  commentsTitle: { fontSize: font.body, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  commentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'flex-start' },
  commentAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarImg: { width: 30, height: 30, borderRadius: 15 },
  commentNick: { fontSize: font.small, fontWeight: '700', color: colors.text },
  commentText: { fontSize: font.body, color: colors.text, marginTop: 2, lineHeight: 20 },
  commentEmpty: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.md },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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