import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { getMyCoin } from '@/api/profile';
import { listMyRedemptions, listRewards, redeemReward, type Reward, type RewardRedemption } from '@/api/rewards';
import { Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'RewardShop'>;

const TABS = ['전체', '카페', '편의점', '상품권'];
type View3 = 'shop' | 'wish' | 'history';

export default function RewardShopScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [coin, setCoin] = useState(0);
  const [tab, setTab] = useState('전체');
  const [view, setView] = useState<View3>('shop');
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'high' | 'low'>('high');
  const [sortOpen, setSortOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [r] = await Promise.all([
        listRewards(),
        user ? getMyCoin(user.id).then(setCoin) : Promise.resolve(),
        user ? listMyRedemptions(user.id).then(setRedemptions) : Promise.resolve(),
      ]);
      setRewards(r);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '리워드 목록을 불러오지 못했어요');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

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
        onPress: async () => {
          try {
            await redeemReward(r.id);
            await refresh();
            Alert.alert('교환 완료', '구매내역에서 확인할 수 있어요.');
          } catch (e: any) {
            Alert.alert('오류', e?.message ?? '교환에 실패했어요'); // 서버 메시지 그대로
          }
        },
      },
    ]);
  };

  const list = useMemo(() => {
    if (view === 'wish') return rewards.filter((r) => wishlist.includes(r.id));
    if (view === 'history') return redemptions.map((rd) => rd.reward);
    const base = tab === '전체' ? rewards : rewards.filter((r) => r.category === tab);
    return [...base].sort((a, b) => (sort === 'high' ? b.cost - a.cost : a.cost - b.cost));
  }, [view, tab, wishlist, rewards, redemptions, sort]);

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
              구매내역 {redemptions.length > 0 ? redemptions.length : ''}
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

            <View style={styles.sortWrap}>
              <Pressable
                style={styles.sortBtn}
                onPress={() => setSortOpen((open) => !open)}
              >
                <Text style={styles.sortText}>
                  {sort === 'high' ? '가격 높은순' : '가격 낮은순'}
                </Text>
                <Icon name="chevron-down" size={16} color={colors.textMuted} />
              </Pressable>

              {sortOpen && (
                <View style={styles.sortMenu}>
                  <Pressable
                    style={[styles.sortMenuItem, sort === 'high' && styles.sortMenuItemActive]}
                    onPress={() => {
                      setSort('high');
                      setSortOpen(false);
                    }}
                  >
                    <Text style={[styles.sortMenuText, sort === 'high' && styles.sortMenuTextActive]}>
                      가격 높은순
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.sortMenuItem, sort === 'low' && styles.sortMenuItemActive]}
                    onPress={() => {
                      setSort('low');
                      setSortOpen(false);
                    }}
                  >
                    <Text style={[styles.sortMenuText, sort === 'low' && styles.sortMenuTextActive]}>
                      가격 낮은순
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
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
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <Text style={styles.empty}>{emptyText}</Text>
          )
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
  sortWrap: { position: 'relative' },
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
  sortMenu: {
    position: 'absolute',
    top: 28,
    right: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minWidth: 120,
    zIndex: 10,
    overflow: 'hidden',
  },
  sortMenuItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sortMenuItemActive: {
    backgroundColor: colors.primary + '10',
  },
  sortMenuText: { color: colors.text, fontSize: font.small },
  sortMenuTextActive: { color: colors.primary, fontWeight: '700' },
});