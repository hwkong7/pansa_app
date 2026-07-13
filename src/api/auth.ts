import { supabase } from '@/lib/supabase';

/**
 * 인증 API (가이드 3-1).
 * 로그인하면 SDK 가 토큰을 자동 저장·첨부한다. Authorization 헤더 직접 다룰 일 없음.
 *
 * ⚠️ 디자인과의 차이:
 * 디자인은 카카오/네이버 소셜 로그인이지만, 현재 백엔드 가이드가 제공하는 건
 * email/password 방식이다. 소셜 로그인을 쓰려면 Supabase Dashboard 에서
 * Auth Provider(Kakao/Naver) 설정 + signInWithOAuth 가 필요하다.
 * 여기서는 가이드에 맞춰 email/password 로 구현한다.
 */

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
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

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
