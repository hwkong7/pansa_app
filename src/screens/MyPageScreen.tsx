import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { signOut } from '@/api/auth';
import { listMyBets } from '@/api/bets';
import { getMyProfile } from '@/api/profile';
import { listMyTrials } from '@/api/trials';
import { Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import type { Profile } from '@/lib/types';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'MyPage'>,
  NativeStackScreenProps<AppStackParamList>
>;

const MENU = ['내 사연 내역', '내 댓글 내역', '배팅 내역', 'P-COIN 지갑', '리워드 교환'];

// 데모: 승률은 정산 이력 집계가 아직 없어 더미 값으로 표시
const DUMMY_WIN_RATE = 68;

export default function MyPageScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notif, setNotif] = useState(true);
  const [myTrialsCount, setMyTrialsCount] = useState(0);
  const [myBetsCount, setMyBetsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getMyProfile(user.id).then(setProfile).catch(() => {});
      listMyTrials(user.id).then((t) => setMyTrialsCount(t.length)).catch(() => {});
      listMyBets().then((b) => setMyBetsCount(b.length)).catch(() => {});
    }, [user])
  );

  const nickname =
    profile?.nickname ?? (user?.user_metadata?.nickname as string) ?? '익명의판사';
  const coin = profile?.coin ?? 0;
  const caseCount = myTrialsCount + myBetsCount;

  const onLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Icon name="mypage" size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nickname}>{nickname}</Text>
            <Text style={styles.profileMeta}>
              CASE {caseCount} 참여 · 승률 {DUMMY_WIN_RATE}%
            </Text>
          </View>
          <Pressable onPress={() => navigation.navigate('ProfileSettings')} hitSlop={10}>
            <Icon name="settings" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <Stat value={`${myTrialsCount}`} label="내 사연" />
          <Stat value={`${coin.toLocaleString()}p`} label="보유코인" highlight />
          <Stat value={`${myBetsCount}`} label="베팅 참여" />
        </View>

        <Text style={styles.sectionLabel}>활동 내역</Text>
        {MENU.map((m) => (
          <Card
            key={m}
            bg={colors.white}
            style={styles.menu}
            onPress={() => {
              if (m === '내 사연 내역') navigation.navigate('Activity', { mode: 'myTrials' });
              else if (m === '내 댓글 내역') navigation.navigate('Activity', { mode: 'myComments' });
              else if (m === '배팅 내역') navigation.navigate('Activity', { mode: 'myBets' });
              else if (m === 'P-COIN 지갑') navigation.navigate('Activity', { mode: 'wallet' });
              else if (m === '리워드 교환') navigation.navigate('RewardShop');
              else Alert.alert(m, '준비 중이에요.');
            }}
          >
            <Text style={styles.menuText}>{m}</Text>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </Card>
        ))}

        <Text style={styles.sectionLabel}>설정</Text>
        <Card bg={colors.white} style={styles.menu}>
          <Text style={styles.menuText}>알림 설정</Text>
          <Switch value={notif} onValueChange={setNotif} trackColor={{ true: colors.primary }} />
        </Card>
        <Card bg={colors.white} style={styles.menu} onPress={() => Alert.alert('고객센터', '준비 중이에요.')}>
          <Text style={styles.menuText}>고객센터</Text>
          <Icon name="chevron-right" size={18} color={colors.textMuted} />
        </Card>

        <Pressable onPress={onLogout} style={styles.logout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Stat({
  value,
  label,
  highlight,
}: {
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, highlight && { color: colors.primary }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nickname: { fontSize: font.h3, fontWeight: '800', color: colors.text },
  profileMeta: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  gear: { fontSize: 22 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.lg,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  statLabel: { color: colors.textMuted, fontSize: font.small, marginTop: 4 },
  sectionLabel: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.lg, marginBottom: spacing.sm },
  menu: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  menuText: { fontSize: font.body, color: colors.text, fontWeight: '600' },
  arrow: { fontSize: font.h3, color: colors.textMuted },
  logout: { alignItems: 'center', marginTop: spacing.lg },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: font.body },
});
