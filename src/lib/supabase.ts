import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * ⚠️ 가이드 5장 유의사항
 * - 프론트에는 Project URL + anon(public) key 만 넣는다.
 * - service_role key 는 절대 넣지 않는다 (넣는 순간 코인 조작 가능).
 * - anon key 는 공개되어도 되는 키다. 권한 제어(RLS)는 서버에서 걸려 있음.
 *
 * 값은 app.json > expo.extra 에서 주입한다. (백엔드 담당자가 전달하는 값)
 */
const extra = Constants.expoConfig?.extra ?? {};

const supabaseUrl: string =
  extra.supabaseUrl ?? 'https://khablhmfdmiqhruhcqeg.supabase.co';
const supabaseAnonKey: string =
  extra.supabaseAnonKey ?? 'sb_publishable_IF9-e1P23-NRXCTRXf4Nhg_gj3gVaFg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // React Native 에서는 세션을 AsyncStorage 에 저장해야 로그인 유지가 된다.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // 웹은 OAuth 콜백이 URL(#access_token=...)로 오므로 감지해야 하고,
    // 모바일은 커스텀 스킴(pansa://)으로 오고 수동으로 setSession 하므로 꺼둔다.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
