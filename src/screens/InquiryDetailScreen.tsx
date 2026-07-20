import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getInquiry, type Inquiry } from '@/api/inquiries';
import { Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'InquiryDetail'>;

export default function InquiryDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInquiry(id)
      .then(setInquiry)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="chevron-right" size={26} color={colors.text} style={styles.back} />
        </Pressable>
        <Text style={styles.topTitle}>문의 상세</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading || !inquiry ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.category}>{inquiry.category}</Text>
          <Text style={styles.title}>{inquiry.title}</Text>
          <Text style={styles.date}>{new Date(inquiry.created_at).toLocaleDateString('ko-KR')}</Text>

          <Card bg={colors.white} style={styles.card}>
            <Text style={styles.content}>{inquiry.content}</Text>
            {inquiry.image_uris && inquiry.image_uris.length > 0 && (
              <View style={styles.thumbRow}>
                {inquiry.image_uris.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.thumb} />
                ))}
              </View>
            )}
          </Card>

          <View style={styles.divider} />
          <Text style={styles.answerLabel}>
            {inquiry.status === 'ANSWERED' ? '답변' : '답변 대기중'}
          </Text>
          {inquiry.status === 'ANSWERED' ? (
            <Card bg={colors.cardBg} style={styles.card}>
              <Text style={styles.content}>{inquiry.answer}</Text>
              {inquiry.answered_at && (
                <Text style={styles.date}>{new Date(inquiry.answered_at).toLocaleDateString('ko-KR')}</Text>
              )}
            </Card>
          ) : (
            <Text style={styles.waitingText}>운영팀이 확인 후 답변드릴게요.</Text>
          )}
        </ScrollView>
      )}
    </Screen>
  );
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
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: spacing.lg, paddingBottom: 40 },
  category: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.text, marginTop: spacing.xs },
  date: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing.xs },
  card: { borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  content: { fontSize: font.body, color: colors.text, lineHeight: 22 },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  thumb: { width: 80, height: 80, borderRadius: radius.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  answerLabel: { fontSize: font.small, fontWeight: '700', color: colors.textMuted },
  waitingText: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.sm },
});
