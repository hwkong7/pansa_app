import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { AuthStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <View style={styles.gavel}>
          <Icon name="gavel" size={72} color={colors.white} />
        </View>
        <Text style={styles.logo}>PANSA</Text>
        <Text style={styles.tagline}>
          익명으로 갈등을 올리고{'\n'}배심원의 판결을 받아보세요
        </Text>
      </View>

      <View style={styles.bottom}>
        <Button
          title="시작하기"
          variant="outline"
          style={styles.startBtn}
          onPress={() => navigation.navigate('Login')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.onboardingBg,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gavel: { marginBottom: spacing.lg },
  logo: {
    color: colors.white,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tagline: {
    color: colors.white,
    opacity: 0.85,
    textAlign: 'center',
    marginTop: spacing.md,
    fontSize: font.body,
    lineHeight: 22,
  },
  bottom: { paddingHorizontal: spacing.lg },
  startBtn: { backgroundColor: colors.white, borderWidth: 0 },
});
