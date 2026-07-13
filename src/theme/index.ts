/**
 * 디자인 시안(밝은 아이보리/블루 법정 테마) 기준 토큰.
 */
export const colors = {
  primary: '#2F6BF6',
  primaryDark: '#1E4FD8',
  onboardingBg: '#2F6BF6',

  bg: '#FFFFFF',
  cardBg: '#F1F5FE', // 연한 파랑 카드
  cardBgAlt: '#EEF2FB',

  text: '#141B34', // 진한 네이비
  textMuted: '#9AA3B2',
  textSubtle: '#6B7280',

  danger: '#E5484D', // 마감임박/거절/경고
  success: '#16A34A', // 환불완료/성공
  warning: '#F59E0B',

  border: '#E5E9F2',
  white: '#FFFFFF',

  tabActive: '#2F6BF6',
  tabInactive: '#9AA3B2',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const font = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 15,
  small: 13,
  tiny: 11,
} as const;
