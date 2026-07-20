// Supabase Edge Function: 네이버 로그인 브릿지
//
// Supabase Auth엔 네이버가 표준 Provider로 없어서 직접 구현한다.
// 흐름: 앱이 네이버에서 받은 인가 코드(code)를 이 함수로 보내면,
//   1) 네이버 토큰 교환 (client_secret은 여기(서버)에서만 사용 — 앱엔 절대 안 들어감)
//   2) 네이버 프로필 조회
//   3) naver_id로 기존 회원 조회, 없으면 신규가입(auth.users + profiles 트리거)
//   4) 매직링크 토큰 발급 → 앱이 supabase.auth.verifyOtp()로 실제 세션을 받도록 함
//      (Postgres에서는 JWT 서명 비밀키에 접근할 수 없어 세션을 직접 못 만들기 때문에,
//       Supabase Admin API의 generateLink를 이 서버 함수에서 대신 호출해준다)
//
// 배포: supabase functions deploy naver-auth
// 필요한 환경변수(supabase secrets set 으로 등록):
//   NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY는 Supabase가 모든 Edge Function에 자동 주입한다.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NAVER_CLIENT_ID = Deno.env.get('NAVER_CLIENT_ID')!;
const NAVER_CLIENT_SECRET = Deno.env.get('NAVER_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { code, state } = await req.json();
    if (!code) return json({ error: '인증 코드가 없습니다' }, 400);

    // 1) 네이버 access_token 교환
    const tokenUrl = new URL('https://nid.naver.com/oauth2.0/token');
    tokenUrl.searchParams.set('grant_type', 'authorization_code');
    tokenUrl.searchParams.set('client_id', NAVER_CLIENT_ID);
    tokenUrl.searchParams.set('client_secret', NAVER_CLIENT_SECRET);
    tokenUrl.searchParams.set('code', code);
    if (state) tokenUrl.searchParams.set('state', state);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenJson = await tokenRes.json();
    if (!tokenJson.access_token) {
      return json({ error: '네이버 토큰 발급에 실패했어요', detail: tokenJson }, 400);
    }

    // 2) 네이버 프로필 조회
    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profileJson = await profileRes.json();
    const naverUser = profileJson?.response;
    if (!naverUser?.id) {
      return json({ error: '네이버 사용자 정보를 가져오지 못했어요', detail: profileJson }, 400);
    }

    const naverId = String(naverUser.id);
    // 네이버가 이메일 제공 동의를 안 받은 계정일 수도 있어 폴백 이메일을 준비한다.
    const email: string = naverUser.email || `naver_${naverId}@naver.pansa.local`;
    const nickname: string = naverUser.nickname || naverUser.name || '익명의판사';

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3) naver_id로 기존 회원 조회
    const { data: existing } = await admin
      .from('profiles')
      .select('id, email')
      .eq('naver_id', naverId)
      .maybeSingle();

    let userEmail = email;

    if (!existing) {
      // 신규 가입 — handle_new_user 트리거가 profiles(코인 500 등)를 자동으로 만들어준다.
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { nickname, naver_id: naverId, provider: 'naver' },
      });
      if (createErr || !created?.user) {
        return json({ error: '회원 생성에 실패했어요', detail: createErr?.message }, 400);
      }
      const { error: updateErr } = await admin
        .from('profiles')
        .update({ naver_id: naverId })
        .eq('id', created.user.id);
      if (updateErr) {
        return json({ error: '회원 정보 연동에 실패했어요', detail: updateErr.message }, 400);
      }
    } else {
      userEmail = existing.email ?? email;
    }

    // 4) 매직링크 토큰 발급 — 앱이 이 token_hash로 verifyOtp() 호출하면 실제 세션이 생긴다.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });
    if (linkErr || !linkData) {
      return json({ error: '로그인 링크 발급에 실패했어요', detail: linkErr?.message }, 400);
    }

    return json({
      email: userEmail,
      token_hash: linkData.properties.hashed_token,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요' }, 500);
  }
});
