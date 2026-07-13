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
  (백엔드 담당자가 값 바꾸면 여기만 교체)

## 폴더 구조

```
src/
  lib/         supabase 클라이언트 + 타입
  api/         auth / trials / bets / profile  ← 백엔드 호출 전부 여기
  context/     AuthContext (세션 상태)
  theme/       색/여백 토큰 (아이보리·블루 법정 테마)
  components/   공용 UI + TrialCard
  navigation/  Root(인증/앱 분기) + Tab
  screens/     14개 화면
```

## 백엔드 연동 가이드에서 "반드시 지킨 것"

이 부분이 이 프로젝트의 핵심입니다. 코드에 그대로 반영돼 있습니다.

1. **쓰기는 무조건 RPC만.** `create_trial` / `respond_to_trial` / `place_bet`.
   테이블에 `.insert()` / `.update()` 하는 코드는 어디에도 없습니다 (RLS 차단됨).
   → `src/api/trials.ts`, `src/api/bets.ts`
2. **읽기는 `.from().select()`** — 목록/단건/코인/원장 조회에만 사용.
3. **마감·정산 코드 없음.** 서버가 매분 자동 처리하므로 프론트는 재판을
   마감/정산시키지 않습니다. 카운트다운(`Countdown`)은 **표시 전용**입니다.
4. **서버 에러 메시지 그대로 노출.** `error.message`를 Alert/토스트에 그대로
   띄웁니다("코인이 부족합니다" 등). 임의 문구로 덮지 않음.
5. **프론트엔 URL + anon key만.** service_role key는 어디에도 없습니다.
   (`src/lib/supabase.ts` 상단 주석 참고)
6. **코인/베팅 규칙:** 판돈 1 이상 정수, 베팅 1~500·재판당 1회·당사자 불가
   (클라 1차 검증 + 서버 최종 검증), 승자 90%·수수료 10%, 무승부=전원 환불.
7. **상태 흐름 UI 분기:** PENDING(수락 대기+초대링크) → OPEN(투표+베팅+카운트다운)
   → SETTLED(판결/성립실패) / REJECTED(자동취소). winner=null이면 무승부.
8. **상태 갱신:** Supabase Realtime 구독 + 30초 폴링 백업.

## ⚠️ 디자인 시안 ↔ 백엔드 가이드 불일치 (내가 판단해서 처리한 부분)

발표 전에 팀과 한 번 맞춰보시면 좋습니다.

1. **소셜 로그인.** 디자인은 카카오/네이버지만, 가이드가 제공하는 인증은
   email/password 뿐입니다. → **email/password로 구현**하고, 소셜 버튼은
   "연동 예정"으로 비활성화 표시. 실제 소셜 로그인은 Supabase Dashboard에서
   Auth Provider 설정 + `signInWithOAuth`가 추가로 필요합니다.
2. **투표 vs 베팅 분리.** 디자인은 "블라인드 투표"와 "P-COIN 베팅"이 별개
   단계처럼 보이지만, 백엔드엔 무료 투표용 RPC가 없습니다. `place_bet`의
   `p_choice(A/B)`가 곧 '어느 편에 투표'를 의미하고, 승패는 그 편에 베팅한
   **사람 수(득표)**로 갈립니다. → **편 선택 + 베팅을 한 번의 `place_bet`으로**
   처리했습니다. (무료 투표가 꼭 필요하면 백엔드에 vote RPC 추가 요청)
3. **카테고리.** `create_trial`에 카테고리 파라미터가 없어, 제목 앞에
   `[연애]`처럼 인코딩해서 저장·필터링합니다. (스키마에 category 컬럼이
   생기면 그걸로 교체하는 게 깔끔)
4. **판돈 최소값.** 디자인의 "최소 500p"는 가이드 규칙(판돈 1 이상, 베팅 1~500)과
   충돌해서 **가이드를 따랐습니다.** 판돈 입력 기본값만 500으로 두었습니다.
5. **제목 필드.** 디자인 사연작성에 제목 입력이 없지만 `create_trial`은
   `p_title`이 필수라, 카테고리 + 사연 앞부분으로 자동 생성합니다.

## 스키마 확인 필요 (백엔드 담당자와)

`trials` 테이블의 정확한 컬럼명(특히 득표수 `votes_a/votes_b`, 총 베팅액
`total_bet`, `closes_at`)은 추정입니다. `src/lib/types.ts`에서 옵셔널로 두어
없어도 앱이 죽지는 않지만, 판결/진행률 화면 숫자를 정확히 띄우려면 실제
컬럼명 확인 후 매핑을 맞춰주세요.

## 딥링크(초대)

초대 링크는 `pansa://invite/<token>` 형식입니다. 실제 카톡 공유 등 웹→앱
링크가 필요하면 Universal Link/App Link(https 도메인) 설정을 추가하세요.
현재는 앱 스킴 기준으로 동작합니다.

## 데모 모드 (로그인·백엔드 없이 화면 보기)

`src/lib/demo.ts` 맨 위의 `DEMO_MODE` 로 제어합니다.

- `DEMO_MODE = true` (현재값): 로그인 없이 바로 앱에 진입하고, 목업 데이터(샘플 재판·코인 1,240P·판결 예시)로 모든 화면이 채워져 보입니다. 베팅하면 코인/득표도 로컬에서 갱신돼요. **발표 시연용.**
- `DEMO_MODE = false`: 실제 Supabase 백엔드에 연결됩니다. 로그인이 필요하고, 백엔드의 "Confirm email" 설정이 켜져 있으면 이메일 인증을 거쳐야 합니다.

시연 화면 흐름 예시:
- 홈 → "실시간 인기재판"(CASE 12345) → 투표 진행 7/10 → 원고/피고 선택 → **P-COIN 베팅하기 → 하단 시트** → 베팅하기
- 홈 → "베스트 판결"(CASE 12300) → **최종판결(피고 승) + 내 베팅액/내 배당 정산 화면**

> ⚠️ 하단 베팅 시트의 빠른금액(1,000P·2,000P·전액)은 백엔드 베팅 상한(500)과 충돌합니다.
> 데모에서는 디자인대로 보여주지만, 실제 연동 시 500 초과는 서버가 거절해요. 발표 후
> (a) 상한을 올릴지 (b) 칩을 100/300/500 등으로 바꿀지 백엔드팀과 정하세요.

## 아이콘 (방식 A / B)

아이콘은 `src/components/icons.tsx` 한 곳에서 관리합니다.

- **방식 A (현재 기본)**: Expo 내장 세트(Feather / MaterialCommunityIcons). 디자인의 Tabler 아이콘과 거의 동일. 색·크기를 코드에서 자유롭게 지정.
- **방식 B (커스텀 SVG)**: Figma에서 뽑은 SVG로 교체하고 싶을 때.
  1) `react-native-svg`는 이미 설치돼 있음.
  2) SVG를 React 컴포넌트로 만들어 `icons.tsx`의 `CUSTOM`에 등록.
  3) 해당 아이콘 이름을 `USE_CUSTOM` 배열에 추가.
  → 화면 코드는 손대지 않아도 그 아이콘만 커스텀으로 바뀝니다.
  ⚠️ 탭바처럼 색이 바뀌어야 하는 아이콘은 **단색 라인 SVG**여야 color 교체가 됩니다.

## 출석체크

홈 화면 출석체크는 **하루 1회** 눌러 적립(+10P)되고, 마지막 체크 날짜·연속일수를
`AsyncStorage`에 저장합니다(앱 재시작해도 유지). 어제 이어서 누르면 연속일수가 올라가고,
하루 건너뛰면 1일차로 리셋됩니다. 실제 백엔드 연동 시 `src/lib/attendance.ts`의
보상 지급 부분을 출석 RPC 호출로 바꾸면 됩니다.

## 업로드된 SVG 아이콘 적용 현황 (방식 B 켜짐)

`src/components/customIcons.tsx` 로 옮겨 실제 사용 중입니다.

| 화면 위치 | 아이콘 | 원본 SVG | 색 교체 |
|---|---|---|---|
| 탭 홈 | home | home.svg | O (활성/비활성) |
| 탭 재판소 | court | court.svg | O |
| 탭 판결 | verdict | judgment.svg | O |
| 탭 마이페이지 | mypage | mypage.svg | O |
| 검색 | search | Magnifier.svg | O |
| 사연작성 이미지첨부 | photo-plus | photo_plus.svg | O |
| 대기중/동의요청 | hourglass | Hourglass.svg | O |
| 재판 자동취소 | frown | sad_face.svg | O |
| 판결 성립실패 | alert | Warning_Indication.svg | O |
| 로그인 소셜 | kakao/naver | kakao.svg / naver.svg | X (브랜드 원색) |

- `_.svg`(파란 원+흰 +)는 `PlusCircleIcon`으로 넣어뒀지만, 재판소 FAB는 그림자 유지를 위해
  기본 흰색 + 아이콘을 파란 원 버튼에 얹는 방식을 그대로 씁니다. FAB를 이 SVG로 바꾸고 싶으면
  `TrialListScreen`의 FAB 배경을 투명으로 바꾸고 `PlusCircleIcon`을 렌더하면 됩니다.
- 되돌리려면 `src/components/icons.tsx`의 `USE_CUSTOM` 배열에서 해당 이름만 빼면 방식 A(내장)로 돌아갑니다.
