import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Legal'>;

// ⚠️ 표준 템플릿 문구입니다. 실제 서비스 운영 전 법률 검토를 거친 문구로 교체해주세요.
const TABS = [
  {
    key: '커뮤니티 운영정책',
    body: `1. 서비스 취지
PANSA는 실제 분쟁을 부추기거나 특정인을 저격하기 위한 서비스가 아닙니다. 이용자가 겪은 갈등 상황을 익명으로 공유하고, 참관인의 투표·의견을 통해 제3자 시각의 판단을 참고해보는 커뮤니티형 콘텐츠 서비스입니다. 사연은 실명·연락처 등으로 특정 개인을 지목하지 않는 것을 원칙으로 합니다.

2. 금지 콘텐츠
다음에 해당하는 게시물(사연/댓글)은 사전 고지 없이 비공개 또는 삭제될 수 있습니다.
- 이름, 연락처, 계정 등 특정 개인을 식별할 수 있는 정보를 포함한 게시물
- 특정인에 대한 명예훼손, 모욕, 혐오·차별 표현
- 성적 수치심을 유발하는 내용, 폭력적이거나 불법행위를 조장하는 내용
- 허위 사실 유포, 상업적 광고 및 스팸성 게시물

3. 신고 및 처리 절차
모든 사연·댓글에는 "더보기 → 신고하기" 메뉴가 제공됩니다. 이용자가 신고 사유를 선택해 접수하면 운영팀이 내용을 검토합니다.
- 접수: 앱 내 신고 기능(report_content)을 통해 즉시 접수, 신고 이력은 서버에 기록됩니다.
- 검토: 접수된 신고는 운영팀이 순차적으로 확인하며, 명백한 규정 위반은 우선 조치합니다.
- 조치: 위반 정도에 따라 게시물 비공개·삭제, 반복·중대 위반 시 이용 제한까지 단계적으로 적용합니다.

4. 추가 문의
신고 외에 이의가 있으시면 마이페이지의 "문의하기"를 통해 운영팀에 직접 연락하실 수 있습니다.`,
  },
  {
    key: '이용약관',
    body: `제1조 (목적)
이 약관은 PANSA(이하 "회사")가 제공하는 모의재판 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
"이용자"란 이 약관에 따라 회사가 제공하는 서비스를 이용하는 회원을 말합니다.
"P-COIN"이란 서비스 내에서 재판 참여, 베팅 등에 사용되는 가상의 포인트를 말하며, 현금으로 환전할 수 없습니다.

제3조 (서비스의 제공 및 변경)
회사는 안정적인 서비스 제공을 위해 노력하며, 서비스의 내용을 변경하거나 중단할 수 있고 이 경우 사전에 공지합니다.

제4조 (이용자의 의무)
이용자는 타인의 권리를 침해하거나 허위 사실을 유포하는 등 관련 법령 및 이 약관에서 금지하는 행위를 해서는 안 됩니다.

제5조 (책임의 한계)
회사는 이용자가 서비스를 이용하며 게재한 정보, 판결 결과 등으로 인해 발생한 손해에 대해 법령이 정하는 한도 내에서 책임을 집니다.`,
  },
  {
    key: '개인정보처리방침',
    body: `1. 수집하는 개인정보 항목
회사는 회원가입 시 이메일, 닉네임을 수집하며, 서비스 이용 과정에서 프로필 사진, 접속 기록 등이 추가로 수집될 수 있습니다.

2. 개인정보의 수집 및 이용 목적
- 회원 식별 및 서비스 제공
- 부정 이용 방지 및 분쟁 처리
- 고객 문의 응대

3. 개인정보의 보유 및 이용 기간
회원 탈퇴 시 지체 없이 파기하며, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.

4. 개인정보의 제3자 제공
회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않으며, 법령에 근거가 있는 경우에 한해 예외로 합니다.

5. 이용자의 권리
이용자는 언제든지 자신의 개인정보를 조회, 수정하거나 삭제(회원 탈퇴)를 요청할 수 있습니다.`,
  },
  {
    key: '오픈소스 라이선스',
    body: `이 앱은 아래와 같은 오픈소스 소프트웨어를 사용하고 있습니다.

- React Native (MIT License)
- Expo (MIT License)
- React Navigation (MIT License)
- Supabase JS Client (MIT License)
- react-native-gesture-handler (MIT License)
- @expo/vector-icons (MIT License)

각 라이브러리의 저작권은 해당 프로젝트 기여자에게 있으며, 자세한 라이선스 전문은 각 프로젝트의 공식 저장소에서 확인하실 수 있습니다.`,
  },
];

export default function LegalScreen({ navigation }: Props) {
  const [tab, setTab] = useState(TABS[0].key);
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="chevron-right" size={26} color={colors.text} style={styles.back} />
        </Pressable>
        <Text style={styles.topTitle}>약관 및 정책</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tabItem}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.key}</Text>
            {tab === t.key && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.body}>{active.body}</Text>
      </ScrollView>
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
  back: { transform: [{ rotate: '180deg' }] },
  topTitle: { fontSize: font.h3, fontWeight: '800', color: colors.text },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  tabItem: { paddingVertical: spacing.sm, marginRight: spacing.lg },
  tabText: { fontSize: font.small, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.text, fontWeight: '800' },
  tabUnderline: { height: 2, backgroundColor: colors.primary, marginTop: 6, borderRadius: 1 },
  container: { padding: spacing.lg, paddingBottom: 40 },
  body: { fontSize: font.small, color: colors.text, lineHeight: 22 },
});
