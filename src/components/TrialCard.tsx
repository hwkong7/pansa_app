import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './ui';
import type { Trial } from '@/lib/types';
import { colors, font, spacing } from '@/theme';

// 제목에 "[연애] ..." 형태로 카테고리를 넣어두었으므로 파싱해서 뱃지로 보여준다.
function parseCategory(title: string): { category: string | null; text: string } {
  const m = title.match(/^\[(.+?)\]\s*(.*)$/);
  if (m) return { category: m[1], text: m[2] };
  return { category: null, text: title };
}

// D-day 계산 (closes_at 있으면 그걸로, 없으면 생략)
function ddayLabel(t: Trial): { label: string; urgent: boolean } | null {
  if (!t.closes_at) return null;
  const diff = new Date(t.closes_at).getTime() - Date.now();
  if (diff <= 0) return { label: '마감', urgent: true };
  const days = Math.ceil(diff / 86_400_000);
  const hours = diff / 3_600_000;
  return { label: `D-${days}`, urgent: hours <= 24 };
}

export function TrialCard({
  trial,
  onPress,
}: {
  trial: Trial;
  onPress: () => void;
}) {
  const { category, text } = parseCategory(trial.title);
  const dday = ddayLabel(trial);

  return (
    <Card bg={colors.white} onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        {category ? <Text style={styles.category}>{category}</Text> : <View />}
        {dday && (
          <Text style={[styles.dday, dday.urgent && styles.ddayUrgent]}>
            {dday.urgent ? '마감임박 · ' : ''}
            {dday.label}
          </Text>
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {text}
      </Text>

      <Text style={styles.meta}>
        조회 {(trial.view_count ?? 0) > 0 ? trial.view_count : '-'} · 상태 {trial.status}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  category: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  dday: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  ddayUrgent: { color: colors.danger },
  title: { color: colors.text, fontSize: font.h3, fontWeight: '700', marginBottom: 6 },
  meta: { color: colors.textMuted, fontSize: font.small },
});
