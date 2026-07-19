import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { listIncomingRequests, listMyTrials, listTrials } from '@/api/trials';
import { Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { TrialCard } from '@/components/TrialCard';
import { useAuth } from '@/context/AuthContext';
import type { Trial } from '@/lib/types';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Trials'>,
  NativeStackScreenProps<AppStackParamList>
>;

const CATEGORIES = ['전체', '연애', '학업', '가족', '친구', '기타'];

export default function TrialListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [trials, setTrials] = useState<Trial[]>([]);
  // 내가 피고로 지정된 PENDING 재판의 id 집합 — 카드 탭 시 ConsentRequest로 보낼지 판단용
  const [incomingIds, setIncomingIds] = useState<Set<number>>(new Set());
  const [category, setCategory] = useState('전체');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'latest' | 'views' | 'deadline'>('latest');
  const [sortOpen, setSortOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // 공개 진행중(OPEN) 재판 + 나와 관련된 PENDING(내가 원고로 쓴 것 / 내가 피고로 받은 것)
      const [open, myTrials, incoming] = await Promise.all([
        listTrials('OPEN'),
        user ? listMyTrials(user.id) : Promise.resolve([]),
        user ? listIncomingRequests(user.id) : Promise.resolve([]),
      ]);
      const myPending = myTrials.filter((t) => t.status === 'PENDING');
      const merged = new Map<number, Trial>();
      [...open, ...myPending, ...incoming].forEach((t) => merged.set(t.id, t));
      setTrials(Array.from(merged.values()));
      setIncomingIds(new Set(incoming.map((t) => t.id)));
    } catch (e: any) {
      setError(e?.message ?? '목록을 불러오지 못했어요');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const list = trials.filter((t) => {
      const inCat = category === '전체' || t.title.includes(`[${category}]`);
      const inSearch =
        !search || t.title.includes(search) || t.story?.includes(search);
      return inCat && inSearch;
    });
    const sorted = [...list];
    if (sort === 'latest') {
      sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sort === 'views') {
      sorted.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    } else if (sort === 'deadline') {
      // 마감임박순: closes_at 가까운 순 (없는 건 뒤로)
      sorted.sort((a, b) => {
        const at = a.closes_at ? new Date(a.closes_at).getTime() : Infinity;
        const bt = b.closes_at ? new Date(b.closes_at).getTime() : Infinity;
        return at - bt;
      });
    }
    return sorted;
  }, [trials, category, search, sort]);

  const SORTS: { key: 'latest' | 'views' | 'deadline'; label: string }[] = [
    { key: 'latest', label: '최신순' },
    { key: 'views', label: '조회수순' },
    { key: 'deadline', label: '마감임박순' },
  ];
  const currentSortLabel = SORTS.find((o) => o.key === sort)?.label ?? '';

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>재판소</Text>
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="사연검색"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.sm }}
          renderItem={({ item }) => (
            <Pressable onPress={() => setCategory(item)}>
              <Text style={[styles.cat, category === item && styles.catActive]}>
                {item}
              </Text>
            </Pressable>
          )}
        />

        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {category} <Text style={styles.countNum}>{filtered.length}</Text>
          </Text>

          <View style={styles.sortRow}>
            <Pressable onPress={() => setSortOpen((v) => !v)} style={styles.sortTrigger}>
              <Text style={styles.sortTriggerText}>{currentSortLabel}</Text>
              <Icon
                name="chevron-down"
                size={14}
                color={colors.textMuted}
                style={sortOpen ? { transform: [{ rotate: '180deg' }] } : undefined}
              />
            </Pressable>

            {sortOpen && (
              <View style={styles.sortMenu}>
                {SORTS.map((o) => (
                  <Pressable
                    key={o.key}
                    style={styles.sortMenuItem}
                    onPress={() => {
                      setSort(o.key);
                      setSortOpen(false);
                    }}
                  >
                    <Text style={[styles.sortMenuItemText, sort === o.key && styles.sortMenuItemTextActive]}>
                      {o.label}
                    </Text>
                    <View style={styles.checkSlot}>
                      {sort === o.key && <Icon name="check" size={14} color={colors.primary} />}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TrialCard
            trial={item}
            onPress={() =>
              incomingIds.has(item.id)
                ? navigation.navigate('ConsentRequest', { id: item.id })
                : navigation.navigate('TrialDetail', { id: item.id })
            }
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {error ?? '아직 진행중인 재판이 없어요.\n오른쪽 아래 + 로 사연을 올려보세요.'}
          </Text>
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTrial')}
      >
        <Icon name="plus" size={30} color={colors.white} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, zIndex: 10, elevation: 10 },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    marginTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text },
  cat: { fontSize: font.body, color: colors.textMuted },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  countText: { fontSize: font.small, color: colors.text, fontWeight: '700' },
  countNum: { color: colors.primary, fontWeight: '800' },
  sortRow: {
    position: 'relative',
    zIndex: 10,
  },
  sortTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  sortTriggerText: { fontSize: font.small, color: colors.textMuted, fontWeight: '700' },
  sortMenu: {
    position: 'absolute',
    top: '100%',
    right: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    height: 40,
    paddingHorizontal: spacing.md,
  },
  sortMenuItemText: { fontSize: font.small, color: colors.textMuted },
  sortMenuItemTextActive: { color: colors.primary, fontWeight: '800' },
  checkSlot: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  catActive: { color: colors.text, fontWeight: '800' },
  list: { padding: spacing.lg, paddingBottom: 120 },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xl,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: colors.white, fontSize: 32, lineHeight: 34 },
});
