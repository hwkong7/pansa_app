import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { listNotifications, markNotificationRead, NOTIFICATIONS_PAGE_SIZE } from '@/api/notifications';
import { Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import type { Notification } from '@/lib/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Notifications'>;

const TYPE_LABEL: Record<Notification['type'], string> = {
  TRIAL_REQUEST: '동의요청',
  TRIAL_STARTED: '재판성립',
  COMMENT: '댓글',
  BET: '베팅',
  RESULT: '재판결과',
  BET_SETTLED: '재판종료',
  WELCOME: '환영',
};

export default function NotificationScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setPage(0);
      listNotifications(user.id, 0)
        .then((rows) => {
          setItems(rows);
          setHasMore(rows.length === NOTIFICATIONS_PAGE_SIZE);
        })
        .catch(() => {});
    }, [user])
  );

  const onEndReached = async () => {
    if (!user || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const rows = await listNotifications(user.id, nextPage);
      setItems((prev) => [...prev, ...rows]);
      setPage(nextPage);
      setHasMore(rows.length === NOTIFICATIONS_PAGE_SIZE);
    } catch {
      // 무시 — 다음 스크롤에서 재시도됨
    } finally {
      setLoadingMore(false);
    }
  };

  const onPressItem = async (n: Notification) => {
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.trial_id != null) {
      if (n.type === 'TRIAL_REQUEST') {
        navigation.navigate('ConsentRequest', { id: n.trial_id });
      } else if (n.type === 'RESULT') {
        navigation.navigate('Verdict', { id: n.trial_id });
      } else {
        navigation.navigate('TrialDetail', { id: n.trial_id });
      }
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="chevron-right" size={26} color={colors.text} style={styles.back} />
        </Pressable>
        <Text style={styles.topTitle}>알림</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onPressItem(item)}>
            {!item.is_read && <View style={styles.unreadDot} />}
            <View style={styles.rowIcon}>
              <Icon name="bell" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowType}>{TYPE_LABEL[item.type]}</Text>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.body && (
                <Text style={styles.rowBody} numberOfLines={2}>
                  {item.body}
                </Text>
              )}
              <Text style={styles.rowDate}>{formatDate(item.created_at)}</Text>
            </View>
          </Pressable>
        )}
        onEndReachedThreshold={0.3}
        onEndReached={onEndReached}
        ListEmptyComponent={<Text style={styles.empty}>아직 알림이 없어요.</Text>}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} /> : null
        }
      />
    </Screen>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
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
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unreadDot: {
    position: 'absolute',
    left: -2,
    top: spacing.md + 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowType: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },
  rowTitle: { color: colors.text, fontSize: font.body, fontWeight: '700', marginTop: 2 },
  rowBody: { color: colors.textMuted, fontSize: font.small, marginTop: 2, lineHeight: 18 },
  rowDate: { color: colors.textMuted, fontSize: font.tiny, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
