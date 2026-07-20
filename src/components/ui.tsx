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
import { Icon } from './icons';

// ── Screen wrapper ────────────────────────────────────────────────
// edges: 기본은 상단만. 하단 고정 버튼이 없는 화면(BottomBar 미사용)은
// edges={['top','bottom']}로 시스템 네비게이션 바(제스처 바/3버튼 바) 영역을 피해야 한다.
// BottomBar를 쓰는 화면은 BottomBar가 자체적으로 insets.bottom을 더하므로 top만으로 충분.
export function Screen({
  children,
  style,
  bg = colors.bg,
  edges = ['top'],
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  bg?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: bg }, style]} edges={edges}>
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

// ── Dropdown (정렬 선택 등 — 재판소/리워드샵에서 공통으로 쓰는 드롭다운) ──
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  align = 'right',
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (key: T) => void;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value)?.label ?? '';

  return (
    <View style={styles.dropdownWrap}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.dropdownTrigger}>
        <Text style={styles.dropdownTriggerText}>{current}</Text>
        <Icon
          name="chevron-down"
          size={14}
          color={colors.textMuted}
          style={open ? { transform: [{ rotate: '180deg' }] } : undefined}
        />
      </Pressable>

      {open && (
        <View style={[styles.dropdownMenu, align === 'left' ? { left: 0 } : { right: 0 }]}>
          {options.map((o) => (
            <Pressable
              key={o.key}
              style={[styles.dropdownMenuItem, value === o.key && styles.dropdownMenuItemActive]}
              onPress={() => {
                onChange(o.key);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownMenuItemText,
                  value === o.key && styles.dropdownMenuItemTextActive,
                ]}
              >
                {o.label}
              </Text>
              <View style={styles.dropdownCheckSlot}>
                {value === o.key && <Icon name="check" size={14} color={colors.primary} />}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
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
  dropdownWrap: { position: 'relative', zIndex: 10 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  dropdownTriggerText: { fontSize: font.small, color: colors.textMuted, fontWeight: '700' },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
    minWidth: 120,
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    height: 40,
    paddingHorizontal: spacing.md,
    marginHorizontal: 6,
    marginVertical: 2,
    borderRadius: radius.sm,
  },
  dropdownMenuItemActive: { backgroundColor: colors.primary + '15' },
  dropdownMenuItemText: { fontSize: font.small, color: colors.textMuted },
  dropdownMenuItemTextActive: { color: colors.primary, fontWeight: '800' },
  dropdownCheckSlot: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  badge: { fontSize: font.small, fontWeight: '700' },
  countdown: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 2,
  },
});
