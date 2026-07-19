import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE, demoAuth } from '@/lib/demo';

/**
 * 인증 API (가이드 3-1).
 *
 * DEMO_MODE 에서는 실제 백엔드/이메일인증 없이 형식만 검증하고 통과시킨다.
 *  - 이메일: '@' 포함
 *  - 비밀번호: 4자 이상
 * 형식이 맞으면 데모 세션을 켜서 홈으로 진입한다. (발표 시연용)
 */

function validateFormat(email: string, password: string) {
  if (!email.includes('@')) throw new Error('이메일 형식이 올바르지 않아요 (@ 필요)');
  if (password.length < 4) throw new Error('비밀번호는 4자 이상 입력해주세요');
}

export async function signUp(email: string, password: string, nickname: string) {
  if (DEMO_MODE) {
    validateFormat(email, password);
    demoAuth.signIn();
    return { user: { id: 'demo-user' } };
  }
  // 닉네임은 auth user_metadata로 전달 → 가입 트리거(005_signup_bonus.sql)가
  // raw_user_meta_data.nickname으로 읽어 profiles.nickname에 저장하고 500코인을 지급한다.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname } },
  });
  if (error) throw error; // 서버 에러 메시지는 한국어 그대로 (가이드 3-4)
  return data;
}

export async function signIn(email: string, password: string) {
  if (DEMO_MODE) {
    validateFormat(email, password);
    demoAuth.signIn();
    return { user: { id: 'demo-user' } };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// ── 소셜 로그인 (가이드 3-1, 카카오/네이버) ─────────────────────────
// ⚠️ 코드는 미리 연결해두지만, Supabase Dashboard → Authentication → Providers
// 에서 카카오/네이버 Provider(App key/secret, redirect URL)를 설정해야 실제로
// 동작한다. 앱 딥링크 스킴(app.json의 "scheme": "pansa")으로 콜백을 받는다.
const OAUTH_REDIRECT_URL = 'pansa://auth-callback';

async function signInWithOAuthProvider(provider: 'kakao' | 'naver') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    // @supabase/supabase-js의 Provider 타입에는 'naver'가 아직 없다(카카오만 표준
    // 제공자로 등록됨). 가이드 3-1 예시가 그대로 provider: 'naver'를 쓰므로,
    // 커스텀 OIDC 제공자로 설정된다는 전제하에 타입만 느슨하게 캐스팅한다.
    provider: provider as any,
    options: {
      redirectTo: OAUTH_REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('로그인 URL을 가져오지 못했어요');

  const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URL);
  if (result.type !== 'success' || !result.url) {
    throw new Error('로그인이 취소됐어요');
  }

  const { params, errorCode } = extractParamsFromUrl(result.url);
  if (errorCode) throw new Error(errorCode);

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  if (!accessToken || !refreshToken) {
    throw new Error('로그인 응답에서 토큰을 찾지 못했어요');
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) throw sessionError;
}

// Supabase OAuth 콜백은 보통 URL 해시(#access_token=...)로 토큰을 내려준다.
function extractParamsFromUrl(url: string): { params: Record<string, string>; errorCode?: string } {
  const fragment = url.split('#')[1] ?? url.split('?')[1] ?? '';
  const params: Record<string, string> = {};
  for (const pair of fragment.split('&')) {
    if (!pair) continue;
    const [key, value] = pair.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
  }
  return { params, errorCode: params.error_description ?? params.error };
}

export async function signInWithKakao() {
  return signInWithOAuthProvider('kakao');
}

export async function signInWithNaver() {
  return signInWithOAuthProvider('naver');
}

export async function signOut() {
  if (DEMO_MODE) {
    demoAuth.signOut();
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
