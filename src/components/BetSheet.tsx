import React, { useEffect, useRef, useState } from 'react';
import {
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
import { Button } from './ui';
import { getMyCoin } from '@/api/profile';
import { useAuth } from '@/context/AuthContext';
import type { Choice, Trial } from '@/lib/types';
import { colors, font, radius, spacing } from '@/theme';

const QUICK = [500, 1000, 2000];
const { height: SCREEN_H } = Dimensions.get('window');
const CLOSE_THRESHOLD = 120;

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
  const [submitting, setSubmitting] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(0);
    setAmount(trial.stake || 500);
    if (user) getMyCoin(user.id).then(setCoin).catch(() => setCoin(null));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // 회색 바를 아래로 끌어내려 닫기
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4,
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

  const submit = async () => {
    setSubmitting(true);
    try {
      await onConfirm(amount);
    } finally {
      setSubmitting(false);
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
        {/* 드래그 존 (회색 바 + 헤더): 아래로 끌어내려 닫기 */}
        <View {...panResponder.panHandlers}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>P-COIN 베팅</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
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
              onPress={() => setAmount(q)}
            />
          ))}
          <Chip
            label="전액"
            active={coin != null && amount === coin}
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

        <Button
          title="베팅하기"
          onPress={submit}
          loading={submitting}
          disabled={overBalance || !choice}
          style={{ marginTop: spacing.md }}
        />
      </Animated.View>
    </Modal>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
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
});
