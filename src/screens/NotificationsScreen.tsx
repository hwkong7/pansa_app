import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
} from '@/api/notifications';
import { Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { AppNotification } from '@/lib/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Notifications'>;

export default function NotificationsScreen({ navigation }: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    listNotifications()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onPressItem = async (n: AppNotification) => {
    if (!n.is_read) {
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, is_read: true } : it)));
      markNotificationsRead([n.id]).catch(() => {});
    }
    if (n.trial_id == null) return;
    if (n.type === 'TRIAL_REQUEST') {
      navigation.navigate('ConsentRequest', { trialId: n.trial_id });
    } else {
      navigation.navigate('TrialDetail', { id: n.trial_id });
    }
  };

  const onMarkAllRead = async () => {
    setItems((prev) => prev.map((it) => ({ ...it, is_read: true })));
    markAllNotificationsRead().catch(() => {});
  };

  const hasUnread = items.some((it) => !it.is_read);

  return (
    <Screen>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="chevron-right" size={26} color={colors.text} style={styles.back} />
        </Pressable>
        <Text style={styles.topTitle}>알림</Text>
        <Pressable onPress={onMarkAllRead} disabled={!hasUnread} hitSlop={10}>
          <Text style={[styles.markAll, !hasUnread && styles.markAllDisabled]}>모두 읽기</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card bg={colors.white} style={styles.row} onPress={() => onPressItem(item)}>
            {!item.is_read && <View style={styles.dot} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>아직 알림이 없어요.</Text> : null
        }
      />
    </Screen>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
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
  markAll: { fontSize: font.small, fontWeight: '700', color: colors.primary },
  markAllDisabled: { color: colors.textMuted },
  list: { padding: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    marginTop: 6,
  },
  message: { fontSize: font.body, fontWeight: '600', color: colors.text, lineHeight: 20 },
  date: { fontSize: font.tiny, color: colors.textMuted, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
