import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { signUp } from '@/api/auth';
import { Button, Card, Screen } from '@/components/ui';
import type { AuthStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

const REQUIRED_TERMS = [
  { key: 'age', label: '[필수] 만 14세 이상' },
  { key: 'tos', label: '[필수] 이용약관 동의' },
  { key: 'privacy', label: '[필수] 개인정보처리방침' },
];

export default function SignupScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('익명의판사');
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const allRequired = REQUIRED_TERMS.every((t) => agreed[t.key]);

  const toggleAll = () => {
    if (allRequired && marketing) {
      setAgreed({});
      setMarketing(false);
    } else {
      const next: Record<string, boolean> = {};
      REQUIRED_TERMS.forEach((t) => (next[t.key] = true));
      setAgreed(next);
      setMarketing(true);
    }
  };

  const onSubmit = async () => {
    setErrorMsg(null);
    if (!allRequired) {
      setErrorMsg('필수 약관에 모두 동의해주세요');
      return;
    }
    setLoading(true);
    try {
      // 가이드 3-1: signUp(email, password).
      // 닉네임은 프로필 테이블에 별도 저장이 필요하나, 테이블 쓰기는 RLS 로 막혀 있어
      // (가이드 3-3) auth user_metadata 로 전달한다. 최종 저장 위치는 백엔드와 확인.
      await signUp(email.trim(), password);
      // 회원가입 성공 → onAuthStateChange 가 세션 감지하여 자동 진입
      // (이메일 인증 설정이 켜져 있으면 인증 후 로그인 필요)
    } catch (e: any) {
      setErrorMsg(e?.message ?? '회원가입에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.header}>프로필을 완성해주세요</Text>
          <Text style={styles.sub}>닉네임과 약관 동의가 필요해요</Text>

          <Text style={styles.label}>닉네임</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="닉네임"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="email@example.com"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="6자 이상"
            placeholderTextColor={colors.textMuted}
          />

          <Card style={{ marginTop: spacing.lg }}>
            <Pressable onPress={toggleAll} style={styles.termRow}>
              <Text style={styles.termAll}>전체동의</Text>
              <Text style={styles.check}>{allRequired && marketing ? '☑' : '☐'}</Text>
            </Pressable>
            <View style={styles.divider} />
            {REQUIRED_TERMS.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setAgreed((p) => ({ ...p, [t.key]: !p[t.key] }))}
                style={styles.termRow}
              >
                <Text style={styles.termLabel}>{t.label}</Text>
                <Text style={[styles.check, agreed[t.key] && { color: colors.success }]}>
                  {agreed[t.key] ? '✓' : '›'}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setMarketing((m) => !m)} style={styles.termRow}>
              <Text style={[styles.termLabel, { color: colors.textMuted }]}>
                [선택] 마케팅 정보 수신
              </Text>
              <Text style={styles.check}>{marketing ? '☑' : '☐'}</Text>
            </Pressable>
          </Card>

          {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

          <Button
            title="가입완료"
            onPress={onSubmit}
            loading={loading}
            disabled={!allRequired}
            style={{ marginTop: spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  header: { fontSize: font.h1, fontWeight: '800', color: colors.text },
  sub: { color: colors.textMuted, marginTop: spacing.xs, fontSize: font.body },
  label: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.md },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    fontSize: font.body,
    color: colors.text,
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  termAll: { fontSize: font.body, fontWeight: '700', color: colors.text },
  termLabel: { fontSize: font.body, color: colors.text },
  check: { fontSize: font.h3, color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  error: { color: colors.danger, marginTop: spacing.md, fontSize: font.small },
});
