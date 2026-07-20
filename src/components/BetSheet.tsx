import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyCoin } from '@/api/profile';
import { useAuth } from '@/context/AuthContext';
import type { Choice, Trial } from '@/lib/types';
import { colors, font, radius, spacing } from '@/theme';

const QUICK = [500, 1000, 2000];
const { height: SCREEN_H } = Dimensions.get('window');
const CLOSE_THRESHOLD = 120;
const DONE_DISPLAY_MS = 700; // "베팅완료" 표시 후 자동으로 닫기까지의 시간

type SubmitStatus = 'idle' | 'submitting' | 'done';

export function BetSheet({
  visible,
  trial,
  choice,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  trial: Trial;
  choice: Choice | null;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void>;
}) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [coin, setCoin] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(500);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const translateY = useRef(new Animated.Value(0)).current;
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(0);
    setAmount(trial.stake || 500);
    setStatus('idle');
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (user) getMyCoin(user.id).then(setCoin).catch(() => setCoin(null));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const isBusy = status !== 'idle';

  // 회색 바를 아래로 끌어내려 닫기 (처리 중에는 실수로 닫히지 않게 잠금)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => !isBusy && g.dy > 4,
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > CLOSE_THRESHOLD || g.vy > 1.2) {
          Animated.timing(translateY, {
            toValue: SCREEN_H,
            duration: 180,
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  const balanceAfter = coin != null ? coin - amount : null;
  const overBalance = balanceAfter != null && balanceAfter < 0;
  const choiceLabel =
    choice === 'A'
      ? trial.option_a || '원고 승'
      : choice === 'B'
      ? trial.option_b || '피고 승'
      : '-';

  // 연타 방지: status가 'idle'이 아니면 즉시 리턴 — 서버 응답 전까지 재요청 자체를 막는다.
  const submit = async () => {
    if (status !== 'idle') return;
    setStatus('submitting');
    try {
      await onConfirm(amount);
      setStatus('done');
      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, DONE_DISPLAY_MS);
    } catch (e: any) {
      setStatus('idle');
      Alert.alert('오류', e?.message ?? '베팅에 실패했어요'); // 서버 메시지 그대로
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm, transform: [{ translateY }] },
        ]}
      >
        {/* 드래그 존 (회색 바 + 헤더): 아래로 끌어내려 닫기 (처리 중엔 잠금) */}
        <View {...panResponder.panHandlers}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>P-COIN 베팅</Text>
            <Pressable onPress={onClose} disabled={isBusy} hitSlop={12}>
              <Text style={[styles.close, isBusy && { opacity: 0.3 }]}>✕</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>베팅 대상</Text>
          <Text style={styles.targetValue}>{choiceLabel}</Text>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>베팅 금액</Text>
          <Text style={styles.amountBig}>{amount.toLocaleString()}P</Text>
        </View>

        <View style={styles.chipRow}>
          {QUICK.map((q) => (
            <Chip
              key={q}
              label={`${q.toLocaleString()}P`}
              active={amount === q}
              disabled={isBusy}
              onPress={() => setAmount(q)}
            />
          ))}
          <Chip
            label="전액"
            active={coin != null && amount === coin}
            disabled={isBusy}
            onPress={() => coin != null && setAmount(coin)}
          />
        </View>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>베팅 후 잔액</Text>
          <Text style={[styles.balanceValue, overBalance && { color: colors.danger }]}>
            {balanceAfter != null ? `${balanceAfter.toLocaleString()}P` : '-'}
          </Text>
        </View>
        <Text style={styles.notice}>투표 마감 전까지만 베팅 가능, 마감 후 취소 불가</Text>

        <SubmitButton
          status={status}
          disabledIdle={overBalance || !choice}
          onPress={submit}
        />
      </Animated.View>
    </Modal>
  );
}

// 연타로 인한 코인 이중 차감을 막기 위한 3단계 버튼: 베팅하기 → 처리 중이에요 → 베팅완료.
// status가 'idle'이 아닌 동안은 onPress 자체가 막혀 있어(disabled) 중복 요청이 나갈 수 없다.
function SubmitButton({
  status,
  disabledIdle,
  onPress,
}: {
  status: SubmitStatus;
  disabledIdle: boolean;
  onPress: () => void;
}) {
  const isSubmitting = status === 'submitting';
  const isDone = status === 'done';
  const bg = isDone ? colors.success : isSubmitting ? colors.cardBg : colors.primary;
  const textColor = isSubmitting ? colors.textMuted : colors.white;
  const label = isDone ? '베팅완료' : isSubmitting ? '처리 중이에요' : '베팅하기';

  return (
    <Pressable
      onPress={onPress}
      disabled={status !== 'idle' || disabledIdle}
      style={[
        styles.submitBtn,
        { backgroundColor: bg },
        status === 'idle' && disabledIdle && { opacity: 0.5 },
      ]}
    >
      {isSubmitting && <ActivityIndicator color={colors.textMuted} size="small" style={{ marginRight: 8 }} />}
      <Text style={[styles.submitBtnText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

function Chip({
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
      style={[styles.chip, active && styles.chipActive, disabled && { opacity: 0.5 }]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(21,27,46,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  close: { fontSize: 20, color: colors.textMuted },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  targetLabel: { color: colors.textMuted, fontSize: font.body },
  targetValue: { color: colors.primary, fontSize: font.body, fontWeight: '800' },
  amountBox: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  amountLabel: { color: colors.textMuted, fontSize: font.small },
  amountBig: { color: colors.text, fontSize: 40, fontWeight: '800', marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.cardBg },
  chipText: { color: colors.text, fontWeight: '700', fontSize: font.small },
  chipTextActive: { color: colors.primary },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  balanceLabel: { color: colors.textSubtle, fontSize: font.body },
  balanceValue: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  notice: { color: colors.textMuted, fontSize: font.tiny, marginTop: 6 },
  submitBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  submitBtnText: { fontSize: font.h3, fontWeight: '700' },
});
