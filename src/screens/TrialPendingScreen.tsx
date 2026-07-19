import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getTrial, subscribeTrial } from '@/api/trials';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { Card, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import { getTrialPhotos, type Trial } from '@/lib/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'TrialPending'>;

const POLL_MS = 10_000; // 수락 대기 중에는 좀 더 자주 확인

// 피고 수락 대기 전용 화면. 사연/사진만 보여주고 댓글은 노출하지 않는다.
// (댓글은 피고가 수락해 OPEN 상태가 된 사연 디테일 화면에서만 보여줌)
export default function TrialPendingScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [trial, setTrial] = useState<Trial | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const load = useCallback(async () => {
    try {
      const t = await getTrial(id);
      setTrial(t);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const unsub = subscribeTrial(id, (t) => setTrial(t));
    pollRef.current = setInterval(load, POLL_MS);
    return () => {
      unsub();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, load]);

  // 피고 수락/거절/무응답 처리되면 알맞은 화면으로 이동
  useEffect(() => {
    if (!trial) return;
    if (trial.status === 'OPEN') {
      Alert.alert('재판 성립', '재판이 성립되었습니다.', [
        { text: '확인', onPress: () => navigation.replace('TrialDetail', { id: trial.id }) },
      ]);
    } else if (trial.status === 'REJECTED') {
      navigation.replace('TrialCanceled', { trialId: trial.id });
    }
  }, [trial?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !trial) {
    return (
      <Screen>
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const category = trial.title.match(/^\[(.+?)\]/)?.[1];
  const photos = getTrialPhotos(trial);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Icon name="chevron-right" size={26} color={colors.text} style={styles.backIcon} />
          </Pressable>
          <Text style={styles.caseNo}>
            CASE {trial.id}
            {category ? `  ${category}` : ''}
          </Text>
        </View>

        <Text style={styles.story}>{trial.story}</Text>

        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoRow}
            contentContainerStyle={styles.photoRowContent}
          >
            {photos.map((uri, i) => (
              <Pressable
                key={`${uri}-${i}`}
                onPress={() => {
                  setViewerIndex(i);
                  setViewerOpen(true);
                }}
              >
                <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.divider} />
        <Card style={styles.pendingCard}>
          <Icon name="hourglass" size={40} color={colors.primary} />
          <Text style={styles.pendingTitle}>상대방(피고) 수락 대기 중</Text>
          <Text style={styles.pendingSub}>
            24시간 내 응답이 없으면 자동 취소되고 판돈은 환불돼요.
          </Text>
        </Card>
      </ScrollView>

      <ImageViewerModal
        visible={viewerOpen}
        images={photos}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 60 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backIcon: { transform: [{ rotate: '180deg' }] },
  caseNo: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  story: { fontSize: font.h3, color: colors.text, lineHeight: 26, marginTop: spacing.md },
  photoRow: { marginTop: spacing.md },
  photoRowContent: { gap: spacing.sm },
  photo: {
    width: 160,
    height: 160,
    borderRadius: radius.lg,
    backgroundColor: colors.cardBg,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  pendingCard: { alignItems: 'center', paddingVertical: spacing.xl },
  pendingTitle: { fontSize: font.h3, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  pendingSub: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, fontSize: font.small },
});
