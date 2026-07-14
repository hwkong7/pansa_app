import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { signOut } from '@/api/auth';
import { getMyProfile, updateMyNickname, updateMyPhoto } from '@/api/profile';
import { Button, Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ProfileSettings'>;

export default function ProfileSettingsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null); // 편집 중 · 확인 전 미리보기
  const [photoSaving, setPhotoSaving] = useState(false);
  const [editing, setEditing] = useState(false); // 회전/반전/자르기 처리 중

  useEffect(() => {
    if (!user) return;
    getMyProfile(user.id)
      .then((p) => {
        setNickname(p.nickname ?? '');
        setPhotoUri(p.photo_uri ?? null);
      })
      .catch(() => {});
  }, [user]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '프로필 사진을 변경하려면 사진 접근 권한이 필요해요.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    // 크롭 직후 바로 반영하지 않고 미리보기 단계를 거쳐 사용자가 확인해야 반영됨
    if (!res.canceled && res.assets?.[0]) setPendingPhotoUri(res.assets[0].uri);
  };

  const cancelPendingPhoto = () => setPendingPhotoUri(null);

  const rotatePhoto = async () => {
    if (!pendingPhotoUri) return;
    setEditing(true);
    try {
      const result = await ImageManipulator.manipulateAsync(pendingPhotoUri, [{ rotate: 90 }], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      setPendingPhotoUri(result.uri);
    } catch {
      Alert.alert('오류', '이미지를 회전하지 못했어요');
    } finally {
      setEditing(false);
    }
  };

  const flipPhoto = async () => {
    if (!pendingPhotoUri) return;
    setEditing(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        pendingPhotoUri,
        [{ flip: ImageManipulator.FlipType.Horizontal }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      setPendingPhotoUri(result.uri);
    } catch {
      Alert.alert('오류', '이미지를 반전하지 못했어요');
    } finally {
      setEditing(false);
    }
  };

  const cropToSquare = async () => {
    if (!pendingPhotoUri) return;
    setEditing(true);
    try {
      const { width, height } = await new Promise<{ width: number; height: number }>(
        (resolve, reject) => {
          Image.getSize(pendingPhotoUri, (w, h) => resolve({ width: w, height: h }), reject);
        }
      );
      const size = Math.min(width, height);
      const result = await ImageManipulator.manipulateAsync(
        pendingPhotoUri,
        [
          {
            crop: {
              originX: Math.round((width - size) / 2),
              originY: Math.round((height - size) / 2),
              width: size,
              height: size,
            },
          },
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      setPendingPhotoUri(result.uri);
    } catch {
      Alert.alert('오류', '이미지를 자르지 못했어요');
    } finally {
      setEditing(false);
    }
  };

  const confirmPhoto = async () => {
    if (!user || !pendingPhotoUri) return;
    setPhotoSaving(true);
    try {
      await updateMyPhoto(user.id, pendingPhotoUri);
      setPhotoUri(pendingPhotoUri);
      setPendingPhotoUri(null);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '프로필 사진 변경에 실패했어요');
    } finally {
      setPhotoSaving(false);
    }
  };

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
        <View style={styles.avatarSection}>
          <Pressable onPress={pickPhoto} style={styles.avatarWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="mypage" size={32} color={colors.primary} />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Icon name="photo-plus" size={14} color={colors.white} />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>탭하여 프로필 사진 변경</Text>
        </View>

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

      <Modal
        visible={!!pendingPhotoUri}
        transparent
        animationType="fade"
        onRequestClose={cancelPendingPhoto}
      >
        <Pressable style={styles.modalBackdrop} onPress={cancelPendingPhoto}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>프로필 사진 편집</Text>
            <View style={styles.previewBox}>
              {pendingPhotoUri && (
                <Image
                  source={{ uri: pendingPhotoUri }}
                  style={styles.previewImg}
                  resizeMode="contain"
                />
              )}
              {editing && (
                <View style={styles.previewOverlay}>
                  <ActivityIndicator color={colors.white} />
                </View>
              )}
            </View>

            <View style={styles.editToolRow}>
              <EditTool icon="crop" label="자르기" onPress={cropToSquare} disabled={editing} />
              <EditTool icon="rotate" label="회전" onPress={rotatePhoto} disabled={editing} />
              <EditTool
                icon="flip-horizontal"
                label="좌우반전"
                onPress={flipPhoto}
                disabled={editing}
              />
            </View>

            <Text style={styles.previewLabel}>이 사진으로 변경할까요?</Text>
            <View style={styles.previewBtnRow}>
              <Pressable onPress={cancelPendingPhoto} style={styles.previewBtnOutline}>
                <Text style={styles.previewBtnOutlineText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={confirmPhoto}
                disabled={photoSaving || editing}
                style={[
                  styles.previewBtnPrimary,
                  (photoSaving || editing) && { opacity: 0.6 },
                ]}
              >
                {photoSaving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.previewBtnPrimaryText}>확인</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function EditTool({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'crop' | 'rotate' | 'flip-horizontal';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.editTool, disabled && { opacity: 0.4 }]}
    >
      <Icon name={icon} size={20} color={colors.text} />
      <Text style={styles.editToolText}>{label}</Text>
    </Pressable>
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

  avatarSection: { alignItems: 'center', marginBottom: spacing.md },
  avatarWrap: { width: 88, height: 88 },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.sm },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(21,27,46,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  modalTitle: {
    alignSelf: 'flex-start',
    fontSize: font.h3,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  previewBox: {
    width: 220,
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImg: { width: '100%', height: '100%' },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(21,27,46,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editToolRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.md,
  },
  editTool: { alignItems: 'center', gap: 4, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  editToolText: { color: colors.text, fontSize: font.tiny, fontWeight: '600' },
  previewLabel: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.md },
  previewBtnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  previewBtnOutline: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  previewBtnOutlineText: { color: colors.textMuted, fontWeight: '700', fontSize: font.small },
  previewBtnPrimary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    minWidth: 72,
    alignItems: 'center',
  },
  previewBtnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: font.small },
});
