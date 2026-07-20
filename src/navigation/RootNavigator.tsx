import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import ConsentRequestScreen from '@/screens/ConsentRequestScreen';
import CreateTrialScreen from '@/screens/CreateTrialScreen';
import FaqScreen from '@/screens/FaqScreen';
import InquiryCreateScreen from '@/screens/InquiryCreateScreen';
import InquiryDetailScreen from '@/screens/InquiryDetailScreen';
import InquiryListScreen from '@/screens/InquiryListScreen';
import LegalScreen from '@/screens/LegalScreen';
import LoginScreen from '@/screens/LoginScreen';
import NotificationScreen from '@/screens/NotificationScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import ProfileSettingsScreen from '@/screens/ProfileSettingsScreen';
import {
  TrialCanceledScreen,
  VerdictFailedScreen,
} from '@/screens/ResultScreens';
import RewardShopScreen from '@/screens/RewardShopScreen';
import ActivityScreen from '@/screens/ActivityScreen';
import SignupScreen from '@/screens/SignupScreen';
import SupportScreen from '@/screens/SupportScreen';
import TrialDetailScreen from '@/screens/TrialDetailScreen';
import TrialPendingScreen from '@/screens/TrialPendingScreen';
import VerdictScreen from '@/screens/VerdictScreen';
import { colors } from '@/theme';
import TabNavigator from './TabNavigator';
import type { AppStackParamList, AuthStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="Faq" component={FaqScreen} />
    </AuthStack.Navigator>
  );
}

function AppFlow() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tabs" component={TabNavigator} />
      <AppStack.Screen name="CreateTrial" component={CreateTrialScreen} />
      <AppStack.Screen name="TrialDetail" component={TrialDetailScreen} />
      <AppStack.Screen name="TrialPending" component={TrialPendingScreen} />
      <AppStack.Screen name="ConsentRequest" component={ConsentRequestScreen} />
      <AppStack.Screen name="TrialCanceled" component={TrialCanceledScreen} />
      <AppStack.Screen name="VerdictFailed" component={VerdictFailedScreen} />
      <AppStack.Screen name="Verdict" component={VerdictScreen} />
      <AppStack.Screen name="RewardShop" component={RewardShopScreen} />
      <AppStack.Screen name="Activity" component={ActivityScreen} />
      <AppStack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <AppStack.Screen name="Notifications" component={NotificationScreen} />
      <AppStack.Screen name="Support" component={SupportScreen} />
      <AppStack.Screen name="Faq" component={FaqScreen} />
      <AppStack.Screen name="InquiryCreate" component={InquiryCreateScreen} />
      <AppStack.Screen name="InquiryList" component={InquiryListScreen} />
      <AppStack.Screen name="InquiryDetail" component={InquiryDetailScreen} />
      <AppStack.Screen name="Legal" component={LegalScreen} />
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
    <NavigationContainer>
      {session ? <AppFlow /> : <AuthFlow />}
    </NavigationContainer>
  );
}
