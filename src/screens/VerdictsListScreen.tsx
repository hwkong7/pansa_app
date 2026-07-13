import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { listTrials } from '@/api/trials';
import { Card, Screen } from '@/components/ui';
import type { Trial } from '@/lib/types';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Verdicts'>,
  NativeStackScreenProps<AppStackParamList>
>;

export default function VerdictsListScreen({ navigation }: Props) {
  const [trials, setTrials] = useState<Trial[]>([]);

  useFocusEffect(
    useCallback(() => {
      listTrials('SETTLED').then(setTrials).catch(() => {});
    }, [])
  );

  return (
    <Screen>
      <Text style={styles.title}>판결</Text>
      <FlatList
        data={trials}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card
            bg={colors.white}
            style={styles.card}
            onPress={() => navigation.navigate('Verdict', { id: item.id })}
          >
            <Text style={styles.caseTitle} numberOfLines={1}>
              {item.title.replace(/^\[.+?\]\s*/, '')}
            </Text>
            <Text style={styles.result}>
              {item.winner === 'A' ? '원고 승' : item.winner === 'B' ? '피고 승' : '무승부'} 확정
            </Text>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>아직 확정된 판결이 없어요.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: font.h1,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  list: { padding: spacing.lg },
  card: { borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  caseTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  result: { color: colors.primary, fontSize: font.small, fontWeight: '700', marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
