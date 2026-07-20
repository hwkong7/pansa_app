import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Support'>;

const MENU: { label: string; route: keyof AppStackParamList }[] = [
  { label: '자주 묻는 질문', route: 'Faq' },
  { label: '1:1 문의하기', route: 'InquiryCreate' },
  { label: '문의 내역', route: 'InquiryList' },
  { label: '약관 및 정책', route: 'Legal' },
];

export default function SupportScreen({ navigation }: Props) {
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="chevron-right" size={26} color={colors.text} style={styles.back} />
        </Pressable>
        <Text style={styles.topTitle}>고객센터</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.container}>
        {MENU.map((m) => (
          <Card
            key={m.route}
            bg={colors.white}
            style={styles.menu}
            onPress={() => navigation.navigate(m.route as any)}
          >
            <Text style={styles.menuText}>{m.label}</Text>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </Card>
        ))}
      </View>
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
  container: { padding: spacing.lg },
  menu: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  menuText: { fontSize: font.body, color: colors.text, fontWeight: '600' },
});
