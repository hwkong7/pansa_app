import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

/**
 * 인증 API. 실제 Supabase Auth로 동작한다.
 */

export async function signUp(email: string, password: string, nickname?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: nickname ? { data: { nickname } } : undefined,
  });
  if (error) throw error; // 서버 에러 메시지를 그대로 노출 (임의 문구로 덮지 않음)
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
  if (error) throw error; // 서버 에러 메시지를 그대로 노출 (임의 문구로 덮지 않음)
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
const REDIRECT_URL = 'pansa://auth-callback';

// ── 카카오: Supabase Auth 표준 Provider ─────────────────────────────
// 대시보드에 Provider(클라이언트 ID/시크릿) + Redirect URL('pansa://auth-callback')이
// 등록돼 있어야 함. 이 URL은 앱의 딥링크 스킴(app.json의 "scheme": "pansa")과도
// 일치해야 로그인 후 앱으로 정상 복귀한다.
export async function signInWithKakao() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
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

// ── 네이버: Supabase 표준 Provider 목록에 없어서 직접 구현 ────────────
// Supabase는 세션 서명용 JWT 비밀키를 앱/SQL 쪽에 노출하지 않으므로, 세션 발급까지
// 직접 처리할 수 없다. 그래서 토큰 교환·프로필 조회·회원가입·매직링크 발급은
// Edge Function(supabase/functions/naver-auth)에 맡기고, 앱은 그 함수가 돌려준
// token_hash로 verifyOtp() 를 호출해 세션만 받아온다.
//
// 네이버 Callback URL은 http(s)만 허용해 pansa:// 커스텀 스킴을 바로 등록할 수 없다.
// 그래서 네이버 콜백은 웹 브릿지 페이지(public/auth-callback.html)로 받고, 그 페이지가
// code/state를 pansa://auth-callback으로 다시 리다이렉트해 앱으로 넘겨준다.
const NAVER_CLIENT_ID: string =
  (Constants.expoConfig?.extra?.naverClientId as string) ?? '';
const NAVER_WEB_CALLBACK_URL = 'https://pansa-app-phi.vercel.app/auth-callback.html';

export async function signInWithNaver() {
  if (!NAVER_CLIENT_ID) throw new Error('네이버 로그인 설정이 없어요');

  // CSRF 방지용 임의 state 값
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);

  const authorizeUrl = new URL('https://nid.naver.com/oauth2.0/authorize');
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', NAVER_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', NAVER_WEB_CALLBACK_URL);
  authorizeUrl.searchParams.set('state', state);

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl.toString(), REDIRECT_URL);
  if (result.type !== 'success' || !result.url) {
    throw new Error('로그인이 취소됐어요');
  }

  const callbackUrl = new URL(result.url);
  const code = callbackUrl.searchParams.get('code');
  const returnedState = callbackUrl.searchParams.get('state');
  if (!code) throw new Error('네이버 로그인 응답에서 인가 코드를 찾지 못했어요');
  if (returnedState !== state) throw new Error('로그인 요청이 위변조된 것 같아요. 다시 시도해주세요');

  const { data, error } = await supabase.functions.invoke('naver-auth', {
    body: { code, state },
  });
  if (error) throw error;
  if (!data?.token_hash) throw new Error('로그인 처리에 실패했어요');

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type: 'magiclink',
  });
  if (verifyError) throw verifyError;
}
