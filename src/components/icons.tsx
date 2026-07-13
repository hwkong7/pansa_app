import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { colors } from '@/theme';
import {
  CourtIcon,
  FrownIcon,
  HomeIcon,
  HourglassIcon,
  JudgmentIcon,
  MyPageIcon,
  PhotoPlusIcon,
  SearchIcon,
  WarningIcon,
} from './customIcons';

/**
 * 아이콘 중앙 관리.
 *
 * 방식 A (기본): Expo 내장 아이콘 세트(Feather/MaterialCommunityIcons). Tabler와 거의 동일.
 * 방식 B (커스텀): 나중에 Figma SVG를 받으면 아래 순서로 교체.
 *   1) SVG를 React 컴포넌트로 만들거나 react-native-svg 로 그린 뒤 CUSTOM 에 등록
 *   2) 해당 아이콘 name 을 USE_CUSTOM 목록에 추가
 *   => 화면 코드는 전혀 건드릴 필요 없음. 이 파일만 수정.
 *
 * ⚠️ 커스텀 SVG는 단색 라인 아이콘이어야 color 교체가 됩니다(탭 활성/비활성 색 전환).
 */

export type IconName =
  | 'home'
  | 'court' // 재판소(저울)
  | 'verdict' // 판결
  | 'mypage'
  | 'bell'
  | 'plus'
  | 'search'
  | 'gavel'
  | 'alert'
  | 'photo-plus'
  | 'hourglass'
  | 'frown'
  | 'chevron-right'
  | 'chevron-down'
  | 'settings'
  | 'heart'
  | 'check';

// 방식 B로 전환할 아이콘 이름 (업로드된 Figma SVG 사용)
const USE_CUSTOM: IconName[] = [
  'home',
  'court',
  'verdict',
  'mypage',
  'search',
  'photo-plus',
  'hourglass',
  'frown',
  'alert',
];

// 방식 B용 커스텀 컴포넌트 등록소
const CUSTOM: Partial<
  Record<IconName, React.ComponentType<{ width: number; height: number; color: string }>>
> = {
  home: HomeIcon,
  court: CourtIcon,
  verdict: JudgmentIcon,
  mypage: MyPageIcon,
  search: SearchIcon,
  'photo-plus': PhotoPlusIcon,
  hourglass: HourglassIcon,
  frown: FrownIcon,
  alert: WarningIcon,
};

// 방식 A 매핑
type Vec =
  | { set: 'feather'; glyph: React.ComponentProps<typeof Feather>['name'] }
  | { set: 'mci'; glyph: React.ComponentProps<typeof MaterialCommunityIcons>['name'] };

const A_MAP: Record<IconName, Vec> = {
  home: { set: 'feather', glyph: 'home' },
  court: { set: 'mci', glyph: 'scale-balance' },
  verdict: { set: 'mci', glyph: 'gavel' },
  mypage: { set: 'feather', glyph: 'user' },
  bell: { set: 'feather', glyph: 'bell' },
  plus: { set: 'feather', glyph: 'plus' },
  search: { set: 'feather', glyph: 'search' },
  gavel: { set: 'mci', glyph: 'gavel' },
  alert: { set: 'feather', glyph: 'alert-triangle' },
  'photo-plus': { set: 'mci', glyph: 'image-plus' },
  hourglass: { set: 'mci', glyph: 'timer-sand' },
  frown: { set: 'feather', glyph: 'frown' },
  'chevron-right': { set: 'feather', glyph: 'chevron-right' },
  'chevron-down': { set: 'feather', glyph: 'chevron-down' },
  settings: { set: 'feather', glyph: 'settings' },
  heart: { set: 'feather', glyph: 'heart' },
  check: { set: 'feather', glyph: 'check' },
};

export function Icon({
  name,
  size = 22,
  color = colors.text,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  // 방식 B (커스텀 SVG)
  if (USE_CUSTOM.includes(name) && CUSTOM[name]) {
    const C = CUSTOM[name]!;
    return <C width={size} height={size} color={color} />;
  }

  // 방식 A (내장 세트)
  const v = A_MAP[name];
  if (v.set === 'feather')
    return <Feather name={v.glyph} size={size} color={color} style={style} />;
  return <MaterialCommunityIcons name={v.glyph} size={size} color={color} style={style} />;
}
