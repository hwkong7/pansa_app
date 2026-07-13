import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  Text,
  TextInput,
  View,
} from 'react-native';
import { buildInviteUrl, createTrial, getInviteToken } from '@/api/trials';
import { Button, BottomBar, Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateTrial'>;

const CATEGORIES = ['연애', '학업', '가족', '기타'];
const MAX_LEN = 500;

export default function CreateTrialScreen({ navigation }: Props) {
  const [category, setCategory] = useState('연애');
  const [story, setStory] = useState('');
  const [stake, setStake] = useState('500'); // 판돈 (가이드: 1 이상 정수)
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const stakeNum = parseInt(stake, 10);
  const canSubmit = story.trim().length >= 5 && Number.isInteger(stakeNum) && stakeNum >= 1;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '이미지를 첨부하려면 사진 접근 권한이 필요해요.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!res.canceled && res.assets?.[0]) setPhotoUri(res.assets[0].uri);
  };

  const onSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('입력 확인', '사연(5자 이상)과 판돈(1 이상)을 확인해주세요.');
      return;
    }
    setLoading(true);
    try {
      // 제목: 백엔드 create_trial 은 p_title 필수. 디자인엔 별도 제목이 없어
      // 카테고리 + 사연 앞부분으로 구성한다. (카테고리 컬럼이 RPC 에 없어 제목에 인코딩)
      const title = `[${category}] ${story.trim().slice(0, 24)}`;

      const trialId = await createTrial({
        title,
        story: story.trim(),
        optionA: '원고 승',
        optionB: '피고 승',
        stake: stakeNum,
      });

      // 생성 후 초대 토큰 조회 → 피고에게 공유할 링크 생성 (가이드 3-2 ②)
      const token = await getInviteToken(trialId);
      const inviteUrl = token ? buildInviteUrl(token) : null;

      if (inviteUrl) {
        Alert.alert(
          '동의요청 링크가 생성됐어요',
          '피고(상대방)에게 아래 링크를 공유하세요.\n\n' + inviteUrl,
          [
            {
              text: '링크 복사',
              onPress: async () => {
                await Clipboard.setStringAsync(inviteUrl);
                // 복사 후 피고 동의요청 화면(ConsentRequest)으로 이동
                if (token) navigation.navigate('ConsentRequest', { token });
                else navigation.navigate('TrialDetail', { id: trialId });
              },
            },
            {
              text: '확인',
              onPress: () => navigation.navigate('TrialDetail', { id: trialId }),
            },
          ]
        );
      } else {
        navigation.navigate('TrialDetail', { id: trialId });
      }
    } catch (e: any) {
      // 서버 에러 메시지 그대로 (가이드 3-4)
      Alert.alert('오류', e?.message ?? '재판 생성에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen bg={colors.cardBgAlt}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()}>
            <Icon name="chevron-right" size={24} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <Text style={styles.topTitle}>사연 작성</Text>
          <View style={{ width: 20 }} />
        </View>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.catRow}>
            {CATEGORIES.map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)}>
                <Text style={[styles.cat, category === c && styles.catActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <Card bg={colors.white} style={styles.storyCard}>
            <TextInput
              style={styles.storyInput}
              value={story}
              onChangeText={(t) => t.length <= MAX_LEN && setStory(t)}
              placeholder="어떤 갈등인지 적어주세요. 예) 3년 사귄 남친이 제 생일을 두 번 연속 까먹었어요. 이거 헤어질 사유 될까요..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <View style={styles.storyFooter}>
              <Pressable onPress={pickImage} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="photo-plus" size={16} color={colors.textSubtle} />
                <Text style={styles.hint}>이미지 첨부 (선택)</Text>
              </Pressable>
              <Text style={styles.count}>
                {story.length} / {MAX_LEN}
              </Text>
            </View>
            {photoUri && (
              <View style={styles.thumbWrap}>
                <Image source={{ uri: photoUri }} style={styles.thumb} />
                <Pressable onPress={() => setPhotoUri(null)} style={styles.thumbRemove}>
                  <Text style={styles.thumbRemoveText}>✕</Text>
                </Pressable>
              </View>
            )}
            <Text style={styles.privacy}>
              개인정보(이름·연락처)는 업로드 시 자동으로 가려 처리돼요
            </Text>
          </Card>

          {/* 판돈 입력 (가이드 UI 체크리스트: 판돈 + 안내 문구 필수) */}
          <Card bg={colors.white} style={styles.stakeCard}>
            <View style={styles.stakeRow}>
              <Text style={styles.stakeLabel}>판돈 (P-COIN)</Text>
              <View style={styles.stakeInputWrap}>
                <TextInput
                  style={styles.stakeInput}
                  value={stake}
                  onChangeText={(t) => setStake(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                />
                <Text style={styles.p}>p</Text>
              </View>
            </View>
            <Text style={styles.stakeNotice}>
              상대(피고)도 같은 금액이 필요하고, 패배 시 몰수돼요 (승자 90% 획득 · 앱 수수료 10%).
              생성 즉시 내 코인에서 차감됩니다.
            </Text>
          </Card>

          <Text style={styles.flowNote}>
            ※ 마감/정산은 서버가 자동 처리해요. 피고가 24시간(무응답 시 자동 취소) 안에
            수락하면 재판이 시작됩니다.
          </Text>
        </ScrollView>

        <BottomBar>
          <Button
            title="피고인에게 동의요청 보내기"
            onPress={onSubmit}
            loading={loading}
            disabled={!canSubmit}
          />
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
    paddingVertical: spacing.md,
  },
  close: { fontSize: 22, color: colors.text },
  topTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  container: { padding: spacing.lg, paddingBottom: 40 },
  catRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  cat: { fontSize: font.body, color: colors.textMuted },
  catActive: {
    color: colors.primary,
    fontWeight: '800',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 2,
  },
  storyCard: { minHeight: 140 },
  storyInput: {
    fontSize: font.body,
    color: colors.text,
    lineHeight: 22,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  storyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  hint: { color: colors.textSubtle, fontSize: font.small },
  thumbWrap: { marginTop: spacing.md, alignSelf: 'flex-start' },
  thumb: { width: 96, height: 96, borderRadius: radius.md },
  thumbRemove: {
    position: 'absolute', top: -8, right: -8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center',
  },
  thumbRemoveText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  count: { color: colors.textMuted, fontSize: font.small },
  privacy: { color: colors.textMuted, fontSize: font.tiny, marginTop: 6 },
  stakeCard: { marginTop: spacing.md },
  stakeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stakeLabel: { fontSize: font.body, fontWeight: '700', color: colors.text },
  stakeInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stakeInput: {
    minWidth: 70,
    textAlign: 'right',
    fontSize: font.h3,
    fontWeight: '800',
    color: colors.primary,
  },
  p: { color: colors.primary, fontWeight: '700' },
  stakeNotice: { color: colors.textSubtle, fontSize: font.small, marginTop: spacing.sm, lineHeight: 18 },
  flowNote: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.lg, lineHeight: 18 },
  bottom: { padding: spacing.lg },
});
