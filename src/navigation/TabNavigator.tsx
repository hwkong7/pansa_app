import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '@/screens/HomeScreen';
import MyPageScreen from '@/screens/MyPageScreen';
import TrialListScreen from '@/screens/TrialListScreen';
import VerdictsListScreen from '@/screens/VerdictsListScreen';
import { Icon, type IconName } from '@/components/icons';
import type { TabParamList } from './types';
import { colors, font } from '@/theme';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, IconName> = {
  Home: 'home',
  Trials: 'court',
  Verdicts: 'verdict',
  MyPage: 'mypage',
};

const LABELS: Record<keyof TabParamList, string> = {
  Home: '홈',
  Trials: '재판소',
  Verdicts: '판결',
  MyPage: '마이페이지',
};

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        },
        tabBarIconStyle: { marginTop: 2 },
        tabBarLabelStyle: { fontSize: font.tiny, marginTop: 2 },
        tabBarIcon: ({ color }) => <Icon name={ICONS[route.name]} size={24} color={color} />,
        tabBarLabel: LABELS[route.name],
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Trials" component={TrialListScreen} />
      <Tab.Screen name="Verdicts" component={VerdictsListScreen} />
      <Tab.Screen name="MyPage" component={MyPageScreen} />
    </Tab.Navigator>
  );
}
