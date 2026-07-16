/**
 * ⚠️ 데모 모드
 *  true  → 회원가입/로그인만 백엔드 없이 형식 검증 후 통과 (발표 시연용).
 *  false → 실제 Supabase 백엔드에 연결.
 *
 * 재판/베팅/댓글/알림 등 그 외 모든 데이터는 항상 실제 Supabase를 사용한다
 * (src/api/*.ts 에는 더 이상 DEMO_MODE 분기가 없음).
 */
export const DEMO_MODE = true;

export const DEMO_USER = { id: 'demo-user', nickname: '익명의판사' };

/* 데모 로그인 (백엔드 없이 통과) */
let _signedIn = false;
const _authListeners = new Set<() => void>();
export const demoAuth = {
  isSignedIn: () => _signedIn,
  signIn: () => {
    _signedIn = true;
    _authListeners.forEach((l) => l());
  },
  signOut: () => {
    _signedIn = false;
    _authListeners.forEach((l) => l());
  },
  subscribe: (cb: () => void) => {
    _authListeners.add(cb);
    return () => {
      _authListeners.delete(cb);
    };
  },
};
