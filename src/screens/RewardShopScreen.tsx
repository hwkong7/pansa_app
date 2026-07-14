import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { getMyCoin } from '@/api/profile';
import { Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { DEMO_MODE, demoState } from '@/lib/demo';
import { useAuth } from '@/context/AuthContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'RewardShop'>;

type Reward = { id: number; name: string; brand: string; cost: number; cat: string; color: string };

const REWARDS: Reward[] = [
  { id: 1, name: '배달의 민족 1만원권', brand: '배달의민족', cost: 10000, cat: '상품권', color: '#2AC1BC' },
  { id: 2, name: '아메리카노 (ICED)', brand: '빽다방', cost: 1500, cat: '카페', color: '#FFCD00' },
  { id: 3, name: '아이스 카페 아메리카노 T', brand: '스타벅스', cost: 4500, cat: '카페', color: '#006241' },
  { id: 4, name: '아메리카노 (ICED)', brand: '컴포즈커피', cost: 1500, cat: '카페', color: '#5B2E90' },
  { id: 5, name: '편의점 5천원권', brand: '세븐일레븐', cost: 5000, cat: '편의점', color: '#F37021' },
  { id: 6, name: '아메리카노 (ICED)', brand: '메가커피', cost: 1500, cat: '카페', color: '#2B2B6B' },
  { id: 7, name: '카페 모카 (ICED)', brand: '메가커피', cost: 2500, cat: '카페', color: '#2B2B6B' },
];

const TABS = ['전체', '카페', '편의점', '상품권'];
type View3 = 'shop' | 'wish' | 'history';

export default function RewardShopScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [coin, setCoin] = useState(0);
  const [tab, setTab] = useState('전체');
  const [view, setView] = useState<View3>('shop');
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [purchases, setPurchases] = useState<number[]>([]);
  const [sort, setSort] = useState<'high' | 'low'>('high');

  const refreshCoin = useCallback(() => {
    if (user) getMyCoin(user.id).then(setCoin).catch(() => {});
  }, [user]);

  useFocusEffect(useCallback(() => { refreshCoin(); }, [refreshCoin]));

  const toggleWish = (id: number) =>
    setWishlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));

  const buy = (r: Reward) => {
    if (coin < r.cost) {
      Alert.alert('코인 부족', `${r.name} 교환에는 ${r.cost.toLocaleString()}P가 필요해요.`);
      return;
    }
    Alert.alert('교환하기', `${r.name}\n${r.cost.toLocaleString()}P를 사용할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '교환',
        onPress: () => {
          if (DEMO_MODE) demoState.coin = Math.max(0, demoState.coin - r.cost);
          setPurchases((p) => [...p, r.id]);
          refreshCoin();
          Alert.alert('교환 완료', '구매내역에서 확인할 수 있어요.');
        },
      },
    ]);
  };

  const list = useMemo(() => {
    if (view === 'wish') return REWARDS.filter((r) => wishlist.includes(r.id));
    if (view === 'history') return purchases.map((id) => REWARDS.find((r) => r.id === id)!).filter(Boolean);
    const base = tab === '전체' ? REWARDS : REWARDS.filter((r) => r.cat === tab);
    return [...base].sort((a, b) => (sort === 'high' ? b.cost - a.cost : a.cost - b.cost));
  }, [view, tab, wishlist, purchases, sort]);

  const title = view === 'wish' ? '찜한 상품' : view === 'history' ? '구매내역' : '리워드샵';
  const emptyText =
    view === 'wish' ? '찜한 상품이 없어요.' : view === 'history' ? '구매내역이 없어요.' : '상품이 없어요.';

  return (
    <Screen>
      {/* 상단바 */}
      <View style={styles.topbar}>
        <Pressable
          onPress={() => (view === 'shop' ? navigation.goBack() : setView('shop'))}
          hitSlop={10}
        >
          <Icon name="chevron-right" size={26} color={colors.text} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.topTitle}>{title}</Text>
        <Icon name="search" size={20} color={colors.text} />
      </View>

      {/* 내 코인 카드 */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceTop}>
          <Text style={styles.balanceLabel}>내 P-COIN</Text>
          <View style={styles.balanceValueRow}>
            <Text style={styles.balanceValue}>{coin.toLocaleString()}p</Text>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </View>
        </View>
        <View style={styles.balanceBtns}>
          <Pressable
            style={[styles.balanceBtn, view === 'wish' && styles.balanceBtnActive]}
            onPress={() => setView(view === 'wish' ? 'shop' : 'wish')}
          >
            <Text style={[styles.balanceBtnText, view === 'wish' && styles.balanceBtnTextActive]}>
              찜한 상품 {wishlist.length > 0 ? wishlist.length : ''}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.balanceBtn, view === 'history' && styles.balanceBtnActive]}
            onPress={() => setView(view === 'history' ? 'shop' : 'history')}
          >
            <Text style={[styles.balanceBtnText, view === 'history' && styles.balanceBtnTextActive]}>
              구매내역 {purchases.length > 0 ? purchases.length : ''}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 카테고리 탭 (shop 뷰에서만) */}
      {view === 'shop' && (
        <>
          <View style={styles.tabRow}>
            {TABS.map((t) => (
              <Pressable key={t} onPress={() => setTab(t)}>
                <Text style={[styles.tab, tab === t && styles.tabActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.sortRow}>
            <Text style={styles.count}>전체 {list.length}</Text>
            <Pressable
              style={styles.sortBtn}
              onPress={() => setSort((s) => (s === 'high' ? 'low' : 'high'))}
            >
              <Text style={styles.sortText}>
                {sort === 'high' ? '가격 높은순' : '가격 낮은순'}
              </Text>
              <Icon name="chevron-down" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </>
      )}

      <FlatList
        data={list}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const affordable = coin >= item.cost;
          const wished = wishlist.includes(item.id);
          const bought = view === 'history';
          return (
            <Pressable style={styles.rewardCard} onPress={() => !bought && buy(item)}>
              <View style={[styles.thumb, { backgroundColor: item.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardName}>{item.name}</Text>
                <Text style={styles.rewardBrand}>{item.brand}</Text>
              </View>
              {bought ? (
                <Text style={styles.done}>교환완료</Text>
              ) : (
                <>
                  <Pressable onPress={() => toggleWish(item.id)} hitSlop={8} style={{ marginRight: spacing.sm }}>
                    <Icon name="heart" size={20} color={wished ? colors.danger : colors.textMuted} />
                  </Pressable>
                  <Text style={[styles.rewardCost, !affordable && { color: colors.textMuted }]}>
                    {item.cost.toLocaleString()}p
                  </Text>
                </>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
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
  backIcon: { transform: [{ rotate: '180deg' }] },
  topTitle: { fontSize: font.h3, fontWeight: '800', color: colors.text },
  balanceCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { color: colors.textSubtle, fontSize: font.body },
  balanceValueRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  balanceValue: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  balanceBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  balanceBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceBtnActive: { borderColor: colors.primary, backgroundColor: colors.white },
  balanceBtnText: { color: colors.text, fontWeight: '600', fontSize: font.small },
  balanceBtnTextActive: { color: colors.primary, fontWeight: '800' },
  tabRow: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  tab: { color: colors.textMuted, fontSize: font.body },
  tabActive: { color: colors.text, fontWeight: '800' },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  count: { color: colors.textMuted, fontSize: font.small },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sortText: { color: colors.textMuted, fontSize: font.small },
  list: { padding: spacing.lg, paddingTop: spacing.md },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  thumb: { width: 44, height: 44, borderRadius: radius.sm },
  rewardName: { fontSize: font.body, fontWeight: '700', color: colors.text },
  rewardBrand: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  rewardCost: { fontSize: font.body, fontWeight: '800', color: colors.text },
  done: { fontSize: font.small, fontWeight: '700', color: colors.success },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});