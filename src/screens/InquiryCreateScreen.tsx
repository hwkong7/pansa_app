import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createInquiry } from '@/api/inquiries';
import { BottomBar, Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'InquiryCreate'>;

const CATEGORIES = ['버그 신고', '이용 문의', '결제/코인', '신고/제재', '기타'];
const MAX_PHOTOS = 3;
const SUPPORT_EMAIL = 'support@pansa.app';

export default function InquiryCreateScreen({ navigation }: Props) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const canSubmit = title.trim().length > 0 && content.trim().length > 0;

  const pickImage = async () => {
    if (photoUris.length >= MAX_PHOTOS) {
      Alert.alert('첨부 제한', `이미지는 최대 ${MAX_PHOTOS}장까지 첨부할 수 있어요.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '이미지를 첨부하려면 사진 접근 권한이 필요해요.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) {
      setPhotoUris((prev) => [...prev, res.assets[0].uri]);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('입력 확인', '제목과 내용을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await createInquiry({ category, title: title.trim(), content: content.trim(), photoUris });
      Alert.alert('접수 완료', '문의가 접수됐어요. 문의 내역에서 확인할 수 있어요.', [
        { text: '확인', onPress: () => navigation.replace('InquiryList') },
      ]);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '문의 등록에 실패했어요'); // 서버 메시지 그대로
    } finally {
      setLoading(false);
    }
  };

  const onMailInstead = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[PANSA] 문의하기')}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // ignore, fall through to fallback alert
    }
    Alert.alert('고객센터', `메일 앱을 열 수 없어요.\n${SUPPORT_EMAIL} 로 문의해주세요.`);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Icon name="chevron-right" size={26} color={colors.text} style={styles.back} />
          </Pressable>
          <Text style={styles.topTitle}>1:1 문의하기</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>카테고리</Text>
          <View style={styles.catRow}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.catChip, category === c && styles.catChipActive]}
              >
                <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>제목</Text>
          <Card bg={colors.white} style={styles.inputCard}>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="제목을 입력해주세요"
              placeholderTextColor={colors.textMuted}
              maxLength={60}
            />
          </Card>

          <Text style={styles.label}>내용</Text>
          <Card bg={colors.white} style={styles.contentCard}>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="문의하실 내용을 자세히 적어주세요."
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </Card>

          <Pressable onPress={pickImage} style={styles.photoButton}>
            <Icon name="photo-plus" size={20} color={colors.text} />
            <Text style={styles.photoButtonText}>
              이미지 첨부 <Text style={{ color: colors.textMuted }}>({photoUris.length}/{MAX_PHOTOS})</Text>
            </Text>
          </Pressable>

          {photoUris.length > 0 && (
            <View style={styles.thumbRow}>
              {photoUris.map((uri, idx) => (
                <View key={uri} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={styles.thumb} />
                  <Pressable onPress={() => removePhoto(idx)} style={styles.thumbRemove}>
                    <Text style={styles.thumbRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <Pressable onPress={onMailInstead} style={styles.mailRow}>
            <Text style={styles.mailText}>답장을 이메일로 직접 받고 싶다면 → {SUPPORT_EMAIL}</Text>
          </Pressable>
        </ScrollView>

        <BottomBar>
          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit || loading}
            style={[styles.submitBtn, (!canSubmit || loading) && { opacity: 0.5 }]}
          >
            {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitBtnText}>문의 접수하기</Text>}
          </Pressable>
        </BottomBar>
      </KeyboardAvoidingView>
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
  container: { padding: spacing.lg, paddingBottom: 40 },
  label: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.lg, marginBottom: spacing.sm },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  inputCard: { borderWidth: 1, borderColor: colors.border },
  titleInput: { fontSize: font.body, color: colors.text, padding: 0 },
  contentCard: { borderWidth: 1, borderColor: colors.border, minHeight: 140 },
  contentInput: {
    fontSize: font.body,
    color: colors.text,
    lineHeight: 22,
    minHeight: 110,
    textAlignVertical: 'top',
    padding: 0,
  },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg },
  photoButtonText: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  thumbWrap: { alignSelf: 'flex-start' },
  thumb: { width: 80, height: 80, borderRadius: radius.md },
  thumbRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRemoveText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  mailRow: { marginTop: spacing.xl, alignItems: 'center' },
  mailText: { color: colors.textMuted, fontSize: font.tiny, textAlign: 'center' },
  submitBtn: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: colors.white, fontWeight: '700', fontSize: font.h3 },
});
