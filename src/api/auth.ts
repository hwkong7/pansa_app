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

export async function signUp(email: string, password: string) {
  if (DEMO_MODE) {
    validateFormat(email, password);
    demoAuth.signIn();
    return { user: { id: 'demo-user' } };
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
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
