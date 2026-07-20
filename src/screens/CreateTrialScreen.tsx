import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createTrial, searchDefendantByEmail } from '@/api/trials';
import { BottomBar, Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { AppStackParamList } from '@/navigation/types';
import {
  DEFAULT_VOTING_DAYS,
  TRIAL_MIN_STAKE,
  VOTING_DAYS_OPTIONS,
} from '@/lib/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateTrial'>;

// 피그마 '3-2 사연작성' (node 141:3990) 컬러 — 이 화면 전용
const FG = {
  bg: '#F0F5FF',
  border: '#E3E9F5',
  text: '#151B2E',
  textMuted: '#8891A8',
  textFaint: '#B7BECD',
  primary: '#1846BE',
  button: '#2662F0',
  black: '#000000',
  white: '#FFFFFF',
} as const;

const CATEGORIES = ['연애', '학업', '가족', '친구', '기타'];
const MAX_LEN = 500;
const MAX_PHOTOS = 5;

export default function CreateTrialScreen({ navigation }: Props) {
  const [category, setCategory] = useState('연애');
  const [story, setStory] = useState('');
  const [stake, setStake] = useState('500'); // 판돈 (최소 TRIAL_MIN_STAKE 이상 정수)
  const [loading, setLoading] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null); // 크롭 직후, 확인 전 미리보기
  const [votingDays, setVotingDays] = useState<number>(DEFAULT_VOTING_DAYS);
  const [votingPickerOpen, setVotingPickerOpen] = useState(false);
  const [defendantEmail, setDefendantEmail] = useState('');
  const [defendant, setDefendant] = useState<{ id: string; nickname: string | null } | null>(null);
  const [searchingDefendant, setSearchingDefendant] = useState(false);

  const stakeNum = parseInt(stake, 10);
  const canSubmit =
    story.trim().length >= 5 &&
    Number.isInteger(stakeNum) &&
    stakeNum >= TRIAL_MIN_STAKE &&
    defendant != null;

  const onSearchDefendant = async () => {
    if (!defendantEmail.trim()) return;
    setSearchingDefendant(true);
    try {
      const found = await searchDefendantByEmail(defendantEmail.trim());
      if (!found) {
        setDefendant(null);
        Alert.alert('검색 결과 없음', '존재하지 않는 사용자예요. 이메일을 다시 확인해주세요.');
        return;
      }
      setDefendant({ id: found.id, nickname: found.nickname });
    } catch (e: any) {
      setDefendant(null);
      Alert.alert('오류', e?.message ?? '검색에 실패했어요');
    } finally {
      setSearchingDefendant(false);
    }
  };

  const pickImage = async () => {
    if (photoUris.length >= MAX_PHOTOS) {
      Alert.alert('첨부 제한', `사진은 최대 ${MAX_PHOTOS}장까지 첨부할 수 있어요.`);
      return;
    }
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
    // 크롭 직후 바로 첨부하지 않고 미리보기 단계를 거쳐 사용자가 확인해야 첨부됨
    if (!res.canceled && res.assets?.[0]) setPendingPhotoUri(res.assets[0].uri);
  };

  const confirmPhoto = () => {
    if (!pendingPhotoUri) return;
    setPhotoUris((prev) => [...prev, pendingPhotoUri]);
    setPendingPhotoUri(null);
  };

  const cancelPendingPhoto = () => setPendingPhotoUri(null);

  const removePhoto = (idx: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async () => {
    if (!canSubmit || !defendant) {
      Alert.alert(
        '입력 확인',
        `사연(5자 이상), 판돈(최소 ${TRIAL_MIN_STAKE}P 이상), 상대방 이메일 확인을 확인해주세요.`
      );
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
        defendantId: defendant.id,
        votingDays,
        photoUris,
      });

      navigation.navigate('TrialPending', { id: trialId });
    } catch (e: any) {
      // 서버 에러 메시지 그대로 (가이드 3-4)
      Alert.alert('오류', e?.message ?? '재판 생성에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen bg={FG.white}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Icon name="close" size={24} color={FG.text} />
          </Pressable>
          <Text style={styles.topTitle}>사연 작성</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.catRow}>
            {CATEGORIES.map((c, idx) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={idx < CATEGORIES.length - 1 ? styles.catItem : undefined}
              >
                <Text style={[styles.cat, category === c && styles.catActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          {/* 상대방(피고) 이메일 검색 — 실제 재판 생성엔 defendant_id가 필수라 반드시 필요한 입력 */}
          <Card bg={FG.white} style={styles.rowCard}>
            <Text style={styles.rowLabel}>상대방 이메일</Text>
            <View style={styles.defendantRow}>
              <TextInput
                style={styles.defendantInput}
                value={defendantEmail}
                onChangeText={(t) => {
                  setDefendantEmail(t);
                  if (defendant) setDefendant(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="email@example.com"
                placeholderTextColor={FG.textFaint}
              />
              <Pressable
                onPress={onSearchDefendant}
                disabled={searchingDefendant || !defendantEmail.trim()}
                style={[
                  styles.defendantSearchBtn,
                  (searchingDefendant || !defendantEmail.trim()) && { opacity: 0.5 },
                ]}
              >
                {searchingDefendant ? (
                  <ActivityIndicator size="small" color={FG.white} />
                ) : (
                  <Text style={styles.defendantSearchBtnText}>확인</Text>
                )}
              </Pressable>
            </View>
            {defendant && (
              <Text style={styles.defendantFound}>
                ✓ {defendant.nickname ?? '익명'}님을 찾았어요
              </Text>
            )}
          </Card>

          <Card bg={FG.bg} style={styles.storyCard}>
            <TextInput
              style={styles.storyInput}
              value={story}
              onChangeText={(t) => t.length <= MAX_LEN && setStory(t)}
              placeholder="어떤 갈등인지 적어주세요. 예) 3년 사귄 남친이 제 생일을 두 번 연속 까먹었어요. 이거 헤어질 사유 될까요..."
              placeholderTextColor={FG.textFaint}
              multiline
            />
            <View style={styles.storyFooter}>
              <Pressable onPress={pickImage} style={styles.photoButton}>
                <Icon name="photo-plus" size={22} color={FG.text} />
                <Text style={styles.hint}>
                  이미지 첨부{' '}
                  <Text style={styles.hintFaint}>
                    ({photoUris.length}/{MAX_PHOTOS})
                  </Text>
                </Text>
              </Pressable>
              <Text style={styles.count}>
                {story.length} / {MAX_LEN}
              </Text>
            </View>

            {/* 크롭 직후 미리보기: 확인을 눌러야 실제로 첨부됨 */}
            {pendingPhotoUri && (
              <View style={styles.previewWrap}>
                <Image source={{ uri: pendingPhotoUri }} style={styles.previewImg} />
                <Text style={styles.previewLabel}>이 사진을 첨부할까요?</Text>
                <View style={styles.previewBtnRow}>
                  <Pressable onPress={cancelPendingPhoto} style={styles.previewBtnOutline}>
                    <Text style={styles.previewBtnOutlineText}>취소</Text>
                  </Pressable>
                  <Pressable onPress={confirmPhoto} style={styles.previewBtnPrimary}>
                    <Text style={styles.previewBtnPrimaryText}>확인</Text>
                  </Pressable>
                </View>
              </View>
            )}

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

            <Text style={styles.privacy}>
              개인정보(이름/연락처)는 업로드 시 자동으로 필터 처리돼요
            </Text>
          </Card>

          {/* 투표 마감일 (피고 수락 시점부터 기간 적용) */}
          <Card bg={FG.white} style={styles.rowCard}>
            <Pressable
              style={styles.rowBetween}
              onPress={() => setVotingPickerOpen(true)}
            >
              <Text style={styles.rowLabel}>투표 마감일</Text>
              <View style={styles.rowValueWrap}>
                <Text style={styles.rowValue}>{votingDays}일 후</Text>
                <Icon name="chevron-right" size={18} color={FG.textMuted} />
              </View>
            </Pressable>
          </Card>

          {/* 판돈 / P-COIN 베팅 (가이드 UI 체크리스트: 판돈 + 안내 문구 필수) */}
          <Card bg={FG.white} style={styles.rowCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel} numberOfLines={1}>
                P-COIN 베팅
              </Text>
              <View style={styles.stakeInputWrap}>
                <Text style={styles.stakePrefix}>최소</Text>
                <TextInput
                  style={styles.stakeInput}
                  value={stake}
                  onChangeText={(t) => setStake(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                />
                <Text style={styles.stakePrefix}>p</Text>
              </View>
            </View>
            <Text style={styles.stakeNotice}>
              투표 마감 전까지 베팅 가능, 마감 후 취소 불가. 최소 {TRIAL_MIN_STAKE}P부터 설정할
              수 있고 패배 시 몰수돼요 (승자 90% 획득 · 앱 수수료 10%).
            </Text>
          </Card>

          <Text style={styles.flowNote}>
            ※ 마감/정산은 서버가 자동 처리해요. 피고가 24시간(무응답 시 자동 취소) 안에
            수락하면 재판이 시작됩니다.
          </Text>
        </ScrollView>

        <BottomBar>
          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit || loading}
            style={[styles.submitBtn, (!canSubmit || loading) && styles.submitBtnDisabled]}
          >
            {loading ? (
              <ActivityIndicator color={FG.white} />
            ) : (
              <Text style={styles.submitBtnText}>피고인에게 동의요청 보내기</Text>
            )}
          </Pressable>
        </BottomBar>
      </KeyboardAvoidingView>

      <Modal
        visible={votingPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setVotingPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setVotingPickerOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>투표 마감일 선택</Text>
            {VOTING_DAYS_OPTIONS.map((d) => (
              <Pressable
                key={d}
                style={styles.modalOption}
                onPress={() => {
                  setVotingDays(d);
                  setVotingPickerOpen(false);
                }}
              >
                <Text
                  style={[styles.modalOptionText, votingDays === d && styles.modalOptionTextActive]}
                >
                  {d}일 후
                </Text>
                {votingDays === d && <Icon name="check" size={18} color={FG.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  topTitle: { fontSize: font.h3, fontWeight: '700', color: FG.text },
  container: { padding: spacing.lg, paddingBottom: 40 },
  catRow: { flexDirection: 'row', marginBottom: spacing.md },
  catItem: { marginRight: spacing.md },
  cat: { fontSize: font.body, color: FG.textFaint, fontWeight: '600' },
  catActive: {
    color: FG.primary,
    fontWeight: '800',
    borderBottomWidth: 2,
    borderBottomColor: FG.primary,
    paddingBottom: 2,
  },
  storyCard: {
    minHeight: 140,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storyInput: {
    fontSize: font.body,
    color: FG.text,
    lineHeight: 22,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  storyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  hint: { color: FG.text, fontSize: font.small, fontWeight: '600' },
  hintFaint: { color: FG.textFaint, fontWeight: '400' },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  thumbWrap: { alignSelf: 'flex-start' },
  thumb: { width: 88, height: 88, borderRadius: radius.md },
  thumbRemove: {
    position: 'absolute', top: -8, right: -8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: FG.text, alignItems: 'center', justifyContent: 'center',
  },
  thumbRemoveText: { color: FG.white, fontSize: 12, fontWeight: '700' },
  count: { color: FG.textFaint, fontSize: font.small },
  privacy: { color: FG.textMuted, fontSize: font.tiny, marginTop: 6 },

  previewWrap: { marginTop: spacing.md, alignItems: 'flex-start' },
  previewImg: { width: 160, height: 160, borderRadius: radius.md },
  previewLabel: { color: FG.textMuted, fontSize: font.small, marginTop: spacing.sm },
  previewBtnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  previewBtnOutline: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: FG.border,
  },
  previewBtnOutlineText: { color: FG.textMuted, fontWeight: '700', fontSize: font.small },
  previewBtnPrimary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: FG.button,
  },
  previewBtnPrimaryText: { color: FG.white, fontWeight: '700', fontSize: font.small },

  rowCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  rowLabel: { fontSize: font.body, fontWeight: '700', color: FG.text, flexShrink: 0 },
  rowValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
  rowValue: { fontSize: font.body, fontWeight: '600', color: FG.textMuted },

  stakeInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  stakePrefix: { color: FG.primary, fontWeight: '700', fontSize: font.body, flexShrink: 0 },
  stakeInput: {
    width: 48,
    textAlign: 'right',
    fontSize: font.h3,
    fontWeight: '800',
    color: FG.primary,
    padding: 0,
    flexShrink: 0,
  },
  stakeNotice: { color: FG.textMuted, fontSize: font.small, marginTop: spacing.sm, lineHeight: 18 },

  defendantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  defendantInput: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: FG.border,
    paddingVertical: spacing.xs,
    fontSize: font.body,
    color: FG.text,
  },
  defendantSearchBtn: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: FG.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defendantSearchBtnText: { color: FG.white, fontWeight: '700', fontSize: font.small },
  defendantFound: { color: FG.primary, fontSize: font.small, fontWeight: '600', marginTop: spacing.sm },
  flowNote: { color: FG.textMuted, fontSize: font.small, marginTop: spacing.lg, lineHeight: 18 },
  bottom: { padding: spacing.lg },

  submitBtn: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: FG.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: FG.white, fontWeight: '700', fontSize: font.h3 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(21,27,46,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: FG.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: font.h3,
    fontWeight: '700',
    color: FG.text,
    marginBottom: spacing.sm,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: FG.border,
  },
  modalOptionText: { fontSize: font.body, color: FG.textMuted, fontWeight: '600' },
  modalOptionTextActive: { color: FG.primary, fontWeight: '800' },
});
