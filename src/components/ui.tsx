import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '@/theme';

// ── Screen wrapper ────────────────────────────────────────────────
export function Screen({
  children,
  style,
  bg = colors.bg,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  bg?: string;
}) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: bg }, style]} edges={['top']}>
      {children}
    </SafeAreaView>
  );
}

// ── BottomBar: 하단 고정 버튼 영역 (삼성/제스처 네비게이션 바와 겹치지 않게) ──
export function BottomBar({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── Primary / secondary button ────────────────────────────────────
export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
      ? colors.white
      : colors.white;
  const borderColor =
    variant === 'outline'
      ? colors.border
      : variant === 'danger'
      ? colors.danger
      : 'transparent';
  const textColor =
    variant === 'primary'
      ? colors.white
      : variant === 'danger'
      ? colors.danger
      : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor, borderWidth: variant === 'primary' ? 0 : 1.5 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.btnText, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

// ── Card ──────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  bg = colors.cardBg,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  bg?: string;
  onPress?: () => void;
}) {
  const content = <View style={[styles.card, { backgroundColor: bg }, style]}>{children}</View>;
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>
        {content}
      </Pressable>
    );
  return content;
}

// ── Category badge ────────────────────────────────────────────────
export function Badge({
  label,
  color = colors.primary,
}: {
  label: string;
  color?: string;
}) {
  return <Text style={[styles.badge, { color }]}>{label}</Text>;
}

// ── Countdown (closes_at 까지 남은 시간) ───────────────────────────
// ⚠️ 표시 전용. 이 컴포넌트는 재판을 마감시키지 않는다(마감은 서버 담당).
export function Countdown({ closesAt }: { closesAt: string | null | undefined }) {
  const [remain, setRemain] = useState<string>('');

  useEffect(() => {
    if (!closesAt) return;
    const target = new Date(closesAt).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setRemain('00 : 00 : 00');
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      setRemain(`${pad(h)} : ${pad(m)} : ${pad(s)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [closesAt]);

  return <Text style={styles.countdown}>{remain || '--:--:--'}</Text>;
}

const styles = StyleSheet.create({
  btn: {
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnText: { fontSize: font.h3, fontWeight: '700' },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  badge: { fontSize: font.small, fontWeight: '700' },
  countdown: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 2,
  },
});
