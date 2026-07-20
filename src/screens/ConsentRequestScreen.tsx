import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getTrial, respondToTrial } from '@/api/trials';
import { BottomBar, Button, Card, Countdown, Screen } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { Trial } from '@/lib/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ConsentRequest'>;

export default function ConsentRequestScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [trial, setTrial] = useState<Trial | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<'accept' | 'reject' | null>(null);

  useEffect(() => {
    getTrial(id)
      .then(setTrial)
      .catch((e: any) => Alert.alert('오류', e?.message ?? '사연을 불러오지 못했어요'))
      .finally(() => setLoading(false));
  }, [id]);

  // 이미 응답이 끝난 재판(수락/거절/그 이후 상태)이면 동의 화면 대신 결과 화면으로 보낸다.
  useEffect(() => {
    if (!trial) return;
    if (trial.status === 'PENDING') return;
    if (trial.status === 'REJECTED') {
      navigation.replace('TrialCanceled', { trialId: trial.id });
    } else {
      navigation.replace('TrialDetail', { id: trial.id });
    }
  }, [trial?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const respond = async (accept: boolean) => {
    setSubmitting(accept ? 'accept' : 'reject');
    try {
      // 수락 시 원고와 동일 금액이 차감됨(잔액 부족 시 에러)
      await respondToTrial(id, accept);
      if (accept && trial) {
        navigation.replace('TrialDetail', { id: trial.id });
      } else if (trial) {
        // 거절 → 재판 취소 결과 화면 (웹/폰 모두 확실히 동작)
        navigation.replace('TrialCanceled', { trialId: trial.id });
      } else {
        navigation.popToTop();
        navigation.popToTop();
      }
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '처리에 실패했어요'); // 서버 메시지 그대로
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!trial) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.notFound}>재판 정보를 불러오지 못했어요.</Text>
        </View>
      </Screen>
    );
  }

  // 응답이 끝난 재판은 위 useEffect가 다른 화면으로 보내는 동안, 잠깐 로딩만 보여준다
  // (동의/거절 버튼이 다시 뜨는 걸 막기 위함).
  if (trial.status !== 'PENDING') {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text style={styles.topTitle}>동의 요청</Text>

        <View style={styles.hero}>
          <Icon name="hourglass" size={40} color={colors.primary} />
          <Text style={styles.heroTitle}>상대방이 사연을 등록했어요</Text>
          <Text style={styles.heroSub}>24시간 내 응답 없으면 자동 취소돼요</Text>
        </View>

        <Text style={styles.sectionLabel}>사연내용</Text>
        <Text style={styles.story}>{trial.story}</Text>

        <Text style={styles.sectionLabel}>판돈</Text>
        <Text style={styles.stake}>
          수락하면 <Text style={{ color: colors.primary, fontWeight: '800' }}>{trial.stake}p</Text>
          가 차감되고, 패배 시 몰수돼요.
        </Text>

        {trial.closes_at && (
          <Card style={styles.timerCard}>
            <Text style={styles.timerLabel}>남은 시간</Text>
            <Countdown closesAt={trial.closes_at} />
          </Card>
        )}
      </ScrollView>

      <BottomBar style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button
          title="거절"
          variant="danger"
          style={{ flex: 1 }}
          loading={submitting === 'reject'}
          onPress={() => respond(false)}
        />
        <Button
          title="동의하고 재판시작"
          style={{ flex: 2 }}
          loading={submitting === 'accept'}
          onPress={() => respond(true)}
        />
      </BottomBar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  notFound: { color: colors.textMuted, textAlign: 'center' },
  container: { flexGrow: 1, padding: spacing.lg },
  topTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text, textAlign: 'center' },
  hero: { alignItems: 'center', marginTop: spacing.xl },
  icon: { fontSize: 40 },
  heroTitle: { fontSize: font.h3, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  heroSub: { color: colors.textMuted, marginTop: spacing.xs, fontSize: font.small },
  sectionLabel: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.lg },
  story: { fontSize: font.body, color: colors.text, lineHeight: 24, marginTop: spacing.sm },
  stake: { fontSize: font.body, color: colors.text, marginTop: spacing.sm },
  timerCard: { alignItems: 'center', marginTop: spacing.lg, paddingVertical: spacing.lg },
  timerLabel: { color: colors.textMuted, fontSize: font.small, marginBottom: 4 },
  bottom: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
});
