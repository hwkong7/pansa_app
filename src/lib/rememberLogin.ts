import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * "로그인 저장" 체크박스 상태.
 * - 체크 안 하고 로그인: 앱을 완전히 껐다가 다시 켰을 때 자동으로 로그아웃되고
 *   온보딩부터 다시 보여준다(다음 코드 조각 참고: AuthContext 최초 구동 시 체크).
 * - 체크하고 로그인(또는 회원가입/소셜 로그인 등 이 값을 건드리지 않은 경우): 세션이
 *   그대로 유지되어 바로 앱으로 들어온다.
 */
const KEY = 'pansa.rememberLogin';

export async function setRememberLogin(remember: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, remember ? 'true' : 'false');
}

export async function shouldForgetLogin(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'false';
}
