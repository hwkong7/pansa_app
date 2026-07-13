import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import ConsentRequestScreen from '@/screens/ConsentRequestScreen';
import CreateTrialScreen from '@/screens/CreateTrialScreen';
import LoginScreen from '@/screens/LoginScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import {
  TrialCanceledScreen,
  VerdictFailedScreen,
} from '@/screens/ResultScreens';
import RewardShopScreen from '@/screens/RewardShopScreen';
import SignupScreen from '@/screens/SignupScreen';
import TrialDetailScreen from '@/screens/TrialDetailScreen';
import VerdictScreen from '@/screens/VerdictScreen';
import { colors } from '@/theme';
import TabNavigator from './TabNavigator';
import type { AppStackParamList, AuthStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

// 딥링크: pansa://invite/<token> → 동의요청 화면
const linking: LinkingOptions<AppStackParamList> = {
  prefixes: ['pansa://'],
  config: {
    screens: {
      ConsentRequest: 'invite/:token',
    },
  },
};

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function AppFlow() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tabs" component={TabNavigator} />
      <AppStack.Screen name="CreateTrial" component={CreateTrialScreen} />
      <AppStack.Screen name="TrialDetail" component={TrialDetailScreen} />
      <AppStack.Screen name="ConsentRequest" component={ConsentRequestScreen} />
      <AppStack.Screen name="TrialCanceled" component={TrialCanceledScreen} />
      <AppStack.Screen name="VerdictFailed" component={VerdictFailedScreen} />
      <AppStack.Screen name="Verdict" component={VerdictScreen} />
      <AppStack.Screen name="RewardShop" component={RewardShopScreen} />
    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {session ? <AppFlow /> : <AuthFlow />}
    </NavigationContainer>
  );
}
