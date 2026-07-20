import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { INQUIRIES_PAGE_SIZE, listMyInquiries, type Inquiry } from '@/api/inquiries';
import { Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'InquiryList'>;

function statusLabel(s: Inquiry['status']) {
  return s === 'ANSWERED' ? '답변완료' : '답변대기';
}

export default function InquiryListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setPage(0);
      listMyInquiries(user.id, 0)
        .then((rows) => {
          setItems(rows);
          setHasMore(rows.length === INQUIRIES_PAGE_SIZE);
        })
        .catch(() => {});
    }, [user])
  );

  const onEndReached = async () => {
    if (!user || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const rows = await listMyInquiries(user.id, nextPage);
      setItems((prev) => [...prev, ...rows]);
      setPage(nextPage);
      setHasMore(rows.length === INQUIRIES_PAGE_SIZE);
    } catch {
      // 무시 — 다음 스크롤에서 재시도됨
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="chevron-right" size={26} color={colors.text} style={styles.back} />
        </Pressable>
        <Text style={styles.topTitle}>문의 내역</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card
            bg={colors.white}
            style={styles.row}
            onPress={() => navigation.navigate('InquiryDetail', { id: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowCat}>{item.category}</Text>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
            </View>
            <Text style={[styles.badge, { color: item.status === 'ANSWERED' ? colors.success : colors.textMuted }]}>
              {statusLabel(item.status)}
            </Text>
          </Card>
        )}
        onEndReachedThreshold={0.3}
        onEndReached={onEndReached}
        ListEmptyComponent={<Text style={styles.empty}>문의 내역이 없어요.</Text>}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} /> : null
        }
      />
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
  list: { padding: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowCat: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700', marginBottom: 2 },
  rowTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  badge: { fontSize: font.small, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
