# PANSA (판사님 여기입니다) — Expo App

익명 갈등 조정 "법정" 앱. 사연 등록 → 피고 동의 → 참관인 투표+베팅 → 판결.
Expo(React Native) + TypeScript + Supabase.

## 실행 방법

```bash
npm install
npx expo start
```

- Expo Go 앱으로 QR 스캔하거나 `i`(iOS 시뮬), `a`(안드로이드 에뮬).
- Supabase URL/anon key는 `app.json` > `expo.extra`에 이미 들어 있습니다.
  값이 바뀌면 이 파일만 교체하면 됩니다.

웹으로 확인하려면 `npx expo export -p web` (Vercel 배포는 `vercel.json` 기준으로 동작).

## 폴더 구조

```
src/
  lib/         supabase 클라이언트 + 타입 + 출석체크/업로드 유틸
  api/         auth / trials / bets / comments / profile / notifications / inquiries / reports / rewards
               ← 백엔드 호출은 전부 여기서만
  context/     AuthContext (세션 상태)
  theme/       색·여백 토큰 (아이보리·블루 법정 테마)
  components/  공용 UI + TrialCard + 아이콘 세트
  navigation/  Root(인증/앱 분기) + Tab
  screens/     화면 컴포넌트
supabase/
  functions/   Supabase Edge Function (네이버 로그인 브릿지 등 Deno 런타임)
public/
  auth-callback.html  웹 배포에서 네이버 OAuth 콜백을 앱 딥링크로 넘겨주는 중계 페이지
```

## 백엔드 연동 원칙

1. **쓰기는 RPC로만 처리합니다.** `create_trial` / `respond_to_trial` / `place_bet` /
   `add_comment` 등. 테이블에 직접 `.insert()` / `.update()`를 호출하는 코드는 없습니다(RLS로 차단됨).
   → `src/api/trials.ts`, `src/api/bets.ts`, `src/api/comments.ts` 등
2. **읽기는 `.from().select()`** — 목록/단건/코인/원장 조회에 사용.
3. **마감·정산은 서버가 처리합니다.** 서버가 매분 자동으로 처리하므로 프론트는 재판을
   직접 마감/정산시키지 않습니다. 카운트다운(`Countdown`)은 **표시 전용**입니다.
4. **서버 에러 메시지를 그대로 노출합니다.** `error.message`를 Alert/토스트에 그대로
   띄웁니다("코인이 부족합니다" 등). 임의 문구로 덮지 않습니다.
5. **프론트엔 URL + anon key만 둡니다.** service_role key는 클라이언트 어디에도 없고,
   Supabase Admin API가 필요한 작업(네이버 로그인 등)은 Edge Function에서만 처리합니다.
6. **코인/베팅 규칙:** 판돈 1 이상 정수, 베팅 1~500·재판당 1회·당사자 불가
   (클라 1차 검증 + 서버 최종 검증), 승자 90%·수수료 10%, 무승부=전원 환불.
7. **상태 흐름:** PENDING(수락 대기) → OPEN(투표+베팅+카운트다운) →
   SETTLED(판결/성립실패) / REJECTED(자동취소). winner=null이면 무승부.
8. **상태 갱신:** Supabase Realtime 구독 + 폴링 백업.

## 디자인 시안 대비 조정된 부분

발표/데모 전에 한 번씩 확인해두면 좋습니다.

1. **재판 상대 지정.** "초대 링크 공유" 대신, 사연 작성 화면에서 상대방 이메일로
   검색해 `defendant_id`를 직접 지정하는 방식으로 구현했습니다(`CreateTrialScreen`의
   상대방 이메일 검색 UI). 상대가 지정되면 알림이 즉시 발송됩니다.
2. **투표 vs 베팅.** "블라인드 투표"와 "P-COIN 베팅"이 화면상 별개처럼 보이지만,
   백엔드에는 무료 투표용 RPC가 따로 없습니다. `place_bet`의 `p_choice(A/B)`가 곧
   '어느 편에 투표'를 의미하고, 승패는 그 편에 베팅한 **사람 수(득표)**로 갈립니다.
   → 편 선택 + 베팅을 한 번의 `place_bet` 호출로 처리합니다.
3. **판돈 최소값.** 디자인의 "최소 500p"는 백엔드 규칙(판돈 1 이상, 베팅 1~500)과
   범위가 달라, 규칙은 백엔드 기준을 따르고 입력 기본값만 500으로 두었습니다.
4. **제목 필드.** 디자인 사연작성 화면엔 제목 입력이 없지만 `create_trial`은
   `p_title`이 필수라, 사연 앞부분을 잘라 자동 생성합니다.

## 소셜 로그인 (카카오 / 네이버)

- **카카오**: Supabase Auth의 표준 OAuth Provider를 사용합니다(`signInWithOAuth`).
  Supabase Dashboard의 Auth Provider 설정(Client ID/Secret, Redirect URL)이 선행돼야 합니다.
- **네이버**: Supabase에 표준 Provider가 없어 직접 구현했습니다. 앱이 네이버 인가 코드를
  받아 `supabase/functions/naver-auth` Edge Function으로 넘기면, 그 함수가 토큰 교환·
  프로필 조회·(신규 회원이면) 가입 처리 후 매직링크 토큰을 돌려주고, 앱이 그 토큰으로
  실제 세션을 발급받습니다. 자세한 흐름은 `src/api/auth.ts`의 `signInWithNaver` 주석 참고.
- 두 방식 모두 앱 전용(`pansa://` 딥링크 스킴 기반)이라, 웹 배포본에서는 별도의
  리다이렉트 처리(`public/auth-callback.html`)가 필요합니다.

## 아이콘 관리 (방식 A / B)

아이콘은 `src/components/icons.tsx` 한 곳에서 관리합니다.

- **방식 A**: Expo 내장 세트(Feather / MaterialCommunityIcons). 색·크기를 코드에서 자유롭게 지정할 수
  있어, 디자인 SVG가 있는 아이콘도 일부러 이 세트를 그대로 쓰기도 합니다.
- **방식 B (커스텀 SVG)**: 디자인에서 받은 SVG를 그대로 쓰고 싶을 때.
  1) `react-native-svg`는 이미 설치돼 있음.
  2) SVG를 React 컴포넌트로 만들어 `icons.tsx`의 `CUSTOM`에 등록.
  3) 해당 아이콘 이름을 `USE_CUSTOM` 배열에 추가.
  → 화면 코드는 손대지 않아도 그 아이콘만 커스텀으로 바뀝니다.
  ⚠️ 탭바처럼 색이 바뀌어야 하는 아이콘은 **단색 라인 SVG**여야 color 교체가 됩니다.

현재 `src/components/customIcons.tsx`에 탭바·검색·사연작성 첨부·대기중·자동취소·
판결 실패·소셜 로그인 아이콘 등이 방식 B로 등록돼 실제 사용 중입니다. 되돌리려면
`icons.tsx`의 `USE_CUSTOM` 배열에서 해당 이름만 빼면 방식 A(내장)로 돌아갑니다.

## 출석체크

홈 화면 출석체크는 하루 1회 눌러 코인이 적립되고, 연속일수와 마지막 체크 날짜를
서버(`profiles.checkin_streak` / `last_checkin_at`)가 관리합니다(`rpc daily_checkin`).
기기를 바꾸거나 앱을 재설치해도 스트릭이 유지됩니다.
