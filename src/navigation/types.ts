import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
};

export type TabParamList = {
  Home: undefined;
  Trials: undefined;
  Verdicts: undefined;
  MyPage: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  CreateTrial: undefined;
  TrialDetail: { id: number };
  TrialPending: { id: number };
  ConsentRequest: { id: number };
  TrialCanceled: { trialId: number };
  VerdictFailed: { trialId: number; totalVotes?: number };
  Verdict: { id: number };
  RewardShop: undefined;
  Activity: { mode: 'myTrials' | 'myComments' | 'myBets' | 'wallet' };
  ProfileSettings: undefined;
  Notifications: undefined;
};
