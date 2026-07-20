import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { AppStackParamList, AuthStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Faq'> | NativeStackScreenProps<AuthStackParamList, 'Faq'>;

const CATEGORIES = [
  {
    key: '재판/사연',
    items: [
      {
        q: '사연을 작성하면 바로 재판이 시작되나요?',
        a: '아니요. 지정한 상대방(피고)이 24시간 안에 동의해야 재판이 시작돼요. 무응답이면 자동으로 취소되고 판돈은 환불됩니다.',
      },
      {
        q: '투표는 언제 마감되나요?',
        a: '사연 작성 시 선택한 투표 기간(1일/3일/7일) 동안 진행되고, 마감되면 서버가 자동으로 정산해요.',
      },
      {
        q: '재판이 성립되려면 몇 표가 필요한가요?',
        a: '최소 10표가 모여야 판결이 확정돼요. 10표 미만이거나 동표면 판결이 성립되지 않고 판돈이 환불됩니다.',
      },
      {
        q: '이미 만든 사연을 삭제하거나 수정할 수 있나요?',
        a: '상대방 응답 전(대기중)이거나 진행중일 때는 내 사연 내역에서 스와이프해서 삭제할 수 있어요. 카테고리 태그는 언제든 다시 고를 수 있습니다. 이미 종료된 재판은 삭제할 수 없어요.',
      },
    ],
  },
  {
    key: 'P-COIN/정산',
    items: [
      {
        q: 'P-COIN은 어떻게 얻나요?',
        a: '회원가입 시 기본 코인이 지급되고, 매일 출석체크로도 코인을 받을 수 있어요.',
      },
      {
        q: '베팅에서 이기면 얼마를 받나요?',
        a: '승자 쪽 판돈의 90%를 나눠 받고, 나머지 10%는 수수료로 차감돼요.',
      },
      {
        q: '베팅 금액 제한이 있나요?',
        a: '재판 하나당 1인 1회, 1~500코인까지 베팅할 수 있어요. 당사자(원고/피고)는 본인 재판에 베팅할 수 없습니다.',
      },
      {
        q: '리워드샵에서 교환한 상품은 언제 받나요?',
        a: '교환 신청 후 순차적으로 지급되며, 진행 상황은 구매내역에서 확인할 수 있어요.',
      },
    ],
  },
  {
    key: '계정/로그인',
    items: [
      {
        q: '로그인이 자꾸 풀려요.',
        a: '로그인 화면에서 "로그인 저장"을 체크하지 않으면 앱을 껐다 켤 때마다 자동으로 로그아웃돼요. 계속 로그인 상태를 유지하려면 체크 후 로그인해주세요.',
      },
      {
        q: '비밀번호는 어디서 바꾸나요?',
        a: '마이페이지 우측 상단 톱니바퀴 아이콘 > 비밀번호 변경 버튼에서 바꿀 수 있어요.',
      },
      {
        q: '닉네임이나 프로필 사진은 어디서 바꾸나요?',
        a: '마이페이지 우측 상단 톱니바퀴 아이콘에서 변경할 수 있어요.',
      },
    ],
  },
  {
    key: '신고/제재',
    items: [
      {
        q: '부적절한 사연이나 댓글을 발견했어요.',
        a: '사연이나 댓글의 ⋯ 메뉴에서 신고할 수 있어요. 신고 내용은 운영팀이 확인합니다.',
      },
      {
        q: '버그를 발견했어요.',
        a: '고객센터 > 1:1 문의하기에서 "버그 신고" 카테고리로 남겨주시면 확인 후 반영할게요.',
      },
      {
        q: '신고하면 바로 게시물이 사라지나요?',
        a: '아니요. 신고가 콘텐츠를 자동으로 숨기지는 않고, 운영팀 확인 후 조치돼요.',
      },
    ],
  },
];

export default function FaqScreen({ navigation }: Props) {
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const items = CATEGORIES.find((c) => c.key === category)?.items ?? [];

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="chevron-right" size={26} color={colors.text} style={styles.back} />
        </Pressable>
        <Text style={styles.topTitle}>자주 묻는 질문</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.catRow}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.key}
            onPress={() => {
              setCategory(c.key);
              setOpenIdx(null);
            }}
            style={[styles.catChip, category === c.key && styles.catChipActive]}
          >
            <Text style={[styles.catChipText, category === c.key && styles.catChipTextActive]}>
              {c.key}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item, idx) => {
          const open = openIdx === idx;
          return (
            <Card key={item.q} bg={colors.white} style={styles.card}>
              <Pressable
                style={styles.qRow}
                onPress={() => setOpenIdx(open ? null : idx)}
              >
                <Text style={styles.q}>{item.q}</Text>
                <Icon
                  name="chevron-down"
                  size={16}
                  color={colors.textMuted}
                  style={open ? { transform: [{ rotate: '180deg' }] } : undefined}
                />
              </Pressable>
              {open && <Text style={styles.a}>{item.a}</Text>}
            </Card>
          );
        })}
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
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: font.small, color: colors.textMuted, fontWeight: '600' },
  catChipTextActive: { color: colors.white, fontWeight: '800' },
  list: { padding: spacing.lg },
  card: { borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  qRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  q: { flex: 1, fontSize: font.body, fontWeight: '700', color: colors.text },
  a: { marginTop: spacing.sm, fontSize: font.small, color: colors.textMuted, lineHeight: 20 },
});
