import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * 인증 API (가이드 3-1). 실제 Supabase Auth로 동작한다.
 */

export async function signUp(email: string, password: string, nickname?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: nickname ? { data: { nickname } } : undefined,
  });
  if (error) throw error; // 서버 에러 메시지는 한국어 그대로 (가이드 3-4)
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error; // 서버 에러 메시지는 한국어 그대로 (가이드 3-4)
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ── 소셜 로그인 (카카오/네이버) ────────────────────────────────────
// Expo(React Native)에는 웹의 window.location.origin 리다이렉트가 없어서,
// signInWithOAuth 가 준 인증 URL을 WebBrowser 로 직접 열고, 앱 스킴(pansa://)으로
// 돌아온 콜백 URL에서 토큰을 꺼내 세션을 수동으로 세팅하는 방식으로 처리한다.
//
// - 카카오: Supabase Auth 표준 Provider. 대시보드에 Provider(클라이언트 ID/시크릿) +
//   Redirect URL('pansa://auth-callback')이 등록돼 있어야 함. 이 URL은 앱의 딥링크
//   스킴(app.json의 "scheme": "pansa")과도 일치해야 로그인 후 앱으로 정상 복귀한다.
// - 네이버: Supabase Auth 표준 Provider 목록엔 없지만, 백엔드가 Edge Functions로 네이버
//   Access Token 인증을 가로채 Custom JWT를 발급하는 방식으로 수동 구축해뒀다(백엔드 팀원
//   확인). 프론트는 아래처럼 그대로 signInWithOAuth 호출하면 되고, 내부적으로 그 커스텀
//   플로우로 처리된다고 함 — 다만 구체적으로 signInWithOAuth 호출 자체가 그 Edge Function을
//   경유하는 건지, 아니면 별도 supabase.functions.invoke() 호출이 필요한 건지는 실제
//   테스트 전까진 확실치 않다.
const REDIRECT_URL = 'pansa://auth-callback';

async function signInWithProvider(provider: 'kakao' | 'naver') {
  const providerCast = provider as import('@supabase/supabase-js').Provider; // ⚠️ naver는 SDK 타입엔 없는 커스텀 구현

  // 웹: 브라우저 자체를 카카오/네이버로 통째로 리다이렉트한다. 돌아올 때 URL의
  // #access_token=... 을 supabase-js 가 자동 감지(detectSessionInUrl)해서 세션을
  // 세팅해주므로, 앱 스킴/WebBrowser/수동 setSession 로직(모바일 전용)이 전혀 필요 없다.
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: providerCast,
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return;
  }

  // 모바일(Expo, React Native): window.location 리다이렉트가 없어서, signInWithOAuth
  // 가 준 인증 URL을 WebBrowser 로 직접 열고, 앱 스킴(pansa://)으로 돌아온 콜백
  // URL에서 토큰을 꺼내 세션을 수동으로 세팅하는 방식으로 처리한다.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: providerCast,
    options: {
      redirectTo: REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('로그인 URL을 가져오지 못했어요');

  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);
  if (result.type !== 'success' || !result.url) {
    throw new Error('로그인이 취소됐어요');
  }

  const url = new URL(result.url.replace('#', '?')); // 토큰은 URL fragment(#)로 오므로 쿼리처럼 파싱
  const access_token = url.searchParams.get('access_token');
  const refresh_token = url.searchParams.get('refresh_token');
  if (!access_token || !refresh_token) {
    throw new Error('로그인 응답에서 인증 정보를 찾지 못했어요');
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (sessionError) throw sessionError;
}

export async function signInWithKakao() {
  return signInWithProvider('kakao');
}

export async function signInWithNaver() {
  return signInWithProvider('naver');
}