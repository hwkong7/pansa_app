import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Alert,
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
import { Icon } from '@/components/icons';
import { setRememberLogin } from '@/lib/rememberLogin';
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
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nickname, setNickname] = useState('익명의판사');
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const allRequired = REQUIRED_TERMS.every((t) => agreed[t.key]);
  const passwordValid = password.length >= 6 && password === passwordConfirm;
  const canSubmit = allRequired && passwordValid;

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
    if (password.length < 6) {
      setErrorMsg('비밀번호는 6자 이상이어야 해요');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg('비밀번호가 서로 일치하지 않아요');
      return;
    }
    setLoading(true);
    try {
      // 닉네임은 auth user_metadata 로 전달하고,
      // 가입 트리거가 이 값을 profiles.nickname 에도 자동 복사해준다.
      await signUp(email.trim(), password, nickname.trim());
      // 회원가입엔 "로그인 저장" 체크박스가 없으니 항상 유지되는 게 기본 동작
      await setRememberLogin(true);
      // 이메일 인증이 켜져 있으면 세션이 바로 안 생기고(onAuthStateChange 무반응),
      // 인증 메일을 확인해야 로그인할 수 있다 — 그 사실을 명확히 알려준다.
      Alert.alert(
        '가입 신청 완료',
        '작성하신 이메일로 인증 메일이 갔습니다. 메일 확인 후 로그인하시면 신규회원 환영 코인 500P가 지급되어 있어요!',
        [{ text: '확인', onPress: () => navigation.navigate('Login') }]
      );
    } catch (e: any) {
      setErrorMsg(e?.message ?? '회원가입에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
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
          <View style={styles.pwRow}>
            <TextInput
              style={styles.pwInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="6자 이상"
              placeholderTextColor={colors.textMuted}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.label}>비밀번호 확인</Text>
          <View style={styles.pwRow}>
            <TextInput
              style={styles.pwInput}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry={!showPassword}
              placeholder="비밀번호를 한 번 더 입력해주세요"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          {passwordConfirm.length > 0 && password !== passwordConfirm && (
            <Text style={styles.pwMismatch}>비밀번호가 서로 달라요</Text>
          )}

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
            disabled={!canSubmit}
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
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
  },
  pwInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: font.body,
    color: colors.text,
  },
  pwMismatch: { color: colors.danger, fontSize: font.tiny, marginTop: 4 },
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
