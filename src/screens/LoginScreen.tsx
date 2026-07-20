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
import { signIn, signInWithKakao, signInWithNaver } from '@/api/auth';
import { Button, Screen } from '@/components/ui';
import { KakaoIcon, NaverIcon } from '@/components/customIcons';
import { setRememberLogin } from '@/lib/rememberLogin';
import type { AuthStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'kakao' | 'naver' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      await setRememberLogin(remember);
      // 성공 시 AuthContext 의 onAuthStateChange 가 감지 → 자동으로 메인 진입
    } catch (e: any) {
      // 서버 에러 메시지 그대로 노출 (가이드 3-4)
      setErrorMsg(e?.message ?? '로그인에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  const onSocial = async (provider: 'kakao' | 'naver') => {
    setErrorMsg(null);
    setSocialLoading(provider);
    try {
      await (provider === 'kakao' ? signInWithKakao() : signInWithNaver());
      // 소셜 로그인엔 "로그인 저장" 체크박스가 없으니 항상 유지되는 게 기본 동작
      await setRememberLogin(true);
      // 성공 시 AuthContext 의 onAuthStateChange 가 감지 → 자동으로 메인 진입
    } catch (e: any) {
      setErrorMsg(e?.message ?? '소셜 로그인에 실패했어요');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.header}>로그인</Text>

          <Text style={styles.label}>아이디 (이메일)</Text>
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
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />

          <Pressable onPress={() => setRemember((v) => !v)} style={styles.rememberRow} hitSlop={6}>
            <Text style={styles.rememberCheck}>{remember ? '☑' : '☐'}</Text>
            <Text style={styles.rememberText}>로그인 저장</Text>
          </Pressable>

          {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

          <Button
            title="지금 로그인"
            onPress={onLogin}
            loading={loading}
            style={{ marginTop: spacing.lg }}
          />

          <View style={styles.socialRow}>
            <Pressable
              style={[styles.social, socialLoading === 'kakao' && { opacity: 0.6 }]}
              onPress={() => onSocial('kakao')}
              disabled={socialLoading !== null}
            >
              <KakaoIcon size={32} />
              <Text style={styles.socialText}>카카오로 로그인</Text>
            </Pressable>
            <Pressable
              style={[styles.social, socialLoading === 'naver' && { opacity: 0.6 }]}
              onPress={() => onSocial('naver')}
              disabled={socialLoading !== null}
            >
              <NaverIcon size={32} />
              <Text style={styles.socialText}>네이버로 로그인</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => navigation.navigate('Signup')}
            style={styles.signupLink}
          >
            <Text style={styles.signupText}>지금 바로 회원가입 ›</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.md },
  header: {
    fontSize: font.h2,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  label: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.md },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    fontSize: font.body,
    color: colors.text,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  rememberCheck: { fontSize: font.h3, color: colors.primary },
  rememberText: { fontSize: font.small, color: colors.textMuted },
  error: { color: colors.danger, marginTop: spacing.md, fontSize: font.small },
  socialRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  social: {
    flex: 1,
    height: 96,
    gap: 6,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: { color: colors.text, textAlign: 'center', fontSize: font.small },
  signupLink: { marginTop: spacing.xl, alignItems: 'center' },
  signupText: { color: colors.text, fontWeight: '700', fontSize: font.body },
});
