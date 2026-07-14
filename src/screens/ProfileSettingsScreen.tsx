import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { signOut } from '@/api/auth';
import { getMyProfile, updateMyNickname } from '@/api/profile';
import { Button, Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ProfileSettings'>;

export default function ProfileSettingsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState(true);

  useEffect(() => {
    if (!user) return;
    getMyProfile(user.id)
      .then((p) => setNickname(p.nickname ?? ''))
      .catch(() => {});
  }, [user]);

  const onSave = async () => {
    if (!user) return;
    if (nickname.trim().length < 1) {
      Alert.alert('입력 확인', '닉네임을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await updateMyNickname(user.id, nickname.trim());
      Alert.alert('완료', '닉네임이 변경됐어요.');
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '닉네임 변경에 실패했어요');
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="chevron-right" size={26} color={colors.text} style={styles.back} />
        </Pressable>
        <Text style={styles.topTitle}>프로필 설정</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionLabel}>닉네임</Text>
        <Card bg={colors.white} style={styles.nicknameCard}>
          <TextInput
            style={styles.nicknameInput}
            value={nickname}
            onChangeText={setNickname}
            placeholder="닉네임을 입력하세요"
            placeholderTextColor={colors.textMuted}
            maxLength={20}
          />
        </Card>
        <Button title="저장" onPress={onSave} loading={saving} style={styles.saveBtn} />

        <Text style={styles.sectionLabel}>설정</Text>
        <Card bg={colors.white} style={styles.menu}>
          <Text style={styles.menuText}>알림 설정</Text>
          <Switch value={notif} onValueChange={setNotif} trackColor={{ true: colors.primary }} />
        </Card>

        <Pressable onPress={onLogout} style={styles.logout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
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
  container: { padding: spacing.lg },
  sectionLabel: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.lg, marginBottom: spacing.sm },
  nicknameCard: { borderWidth: 1, borderColor: colors.border },
  nicknameInput: { fontSize: font.body, color: colors.text, padding: 0 },
  saveBtn: { marginTop: spacing.md },
  menu: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  menuText: { fontSize: font.body, color: colors.text, fontWeight: '600' },
  logout: { alignItems: 'center', marginTop: spacing.lg },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: font.body },
});
