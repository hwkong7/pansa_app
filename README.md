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
  api/         auth / trials / bets / comments / profile / notifications  ← 백엔드 호출 전부 여기
  context/     AuthContext (세션 상태)
  theme/       색/여백 토큰 (아이보리·블루 법정 테마)
  components/   공용 UI + TrialCard
  navigation/  Root(인증/앱 분기) + Tab
  screens/     16개 화면 (알림함 포함)
supabase/sql/  create_trial/respond_to_trial/place_bet은 이미 백엔드에 구축돼
               있어 여기서 안 건드립니다. 이 폴더는 알림함/실제댓글/가입보상처럼
               가이드에 없는 새 기능을 위해 백엔드 담당자에게 전달할 요청 SQL
               스펙입니다 (제가 직접 실행하지 않음). 자세한 건 `supabase/sql/README.md`.
```

## 백엔드 연동 가이드에서 "반드시 지킨 것"

이 부분이 이 프로젝트의 핵심입니다. 코드에 그대로 반영돼 있습니다.

1. **쓰기는 무조건 RPC만, 이미 구축된 함수는 그대로 호출.** `create_trial` /
   `respond_to_trial` / `place_bet`은 백엔드 담당자가 이미 만들어둔 함수라 SQL로
   다시 정의하지 않고 가이드 3-2 코드 그대로 `supabase.rpc(...)`로 호출만
   합니다. 피고인 유저 검색도 가이드 그대로 `.from('profiles').select(...)`
   읽기입니다. (`add_comment`는 아직 없는 RPC라 `supabase/sql/`에 요청 스펙만
   정리해뒀고, 닉네임/사진 변경은 RPC가 없어 우선 `.from('profiles').update()`
   직접 호출로 처리 — 백엔드 RLS가 막아두면 별도 요청 필요.)
   → `src/api/trials.ts`, `src/api/bets.ts`, `src/api/comments.ts`, `src/api/profile.ts`
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

1. **소셜 로그인.** 가이드 3-1에 카카오/네이버 `signInWithOAuth` 코드가 포함돼
   있어 `src/api/auth.ts`(`signInWithKakao`/`signInWithNaver`)와
   `LoginScreen`의 버튼을 실제로 연결해뒀습니다. 다만 Supabase Dashboard →
   Authentication → Providers에서 카카오/네이버 App key/secret과 콜백
   URL(`pansa://auth-callback`)을 등록해야 실제로 로그인이 완료됩니다(이 설정은
   코드로 대신할 수 없어 백엔드/운영 담당자가 해야 함).
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

## 재판 요청 방식

초대 링크 공유 방식은 없앴습니다. 가이드 3-2대로, 사연 작성 화면에서 **상대방
이메일**을 입력하면 `profiles.email`로 검색해 상대방 `id`를 찾고, 그 id를
`create_trial`의 `p_defendant_id`로 넘겨 피고를 지정합니다. 피고에게는 "OO님이
재판을 요청했습니다" 알림이 가고(홈 화면 상단 배너 + 종 아이콘 알림함), 원고는
생성 직후 "피고에게 요청하였습니다" 메시지만 보고 대기 화면으로 이동합니다.
피고는 홈 화면 배너나 알림함에서 눌러 `ConsentRequestScreen`으로 들어가
수락/거절합니다.

## 알림함

홈 화면 우측 상단 종 아이콘 → `NotificationsScreen`. 안읽은 알림은 종 아이콘에
빨간 원+숫자 뱃지로 표시되고(Realtime 구독으로 즉시 갱신), 목록에서 항목을 누르면
읽음 처리 후 관련 화면(수락/거절 or 재판 상세)으로 이동합니다. 종류: 재판요청 /
재판성립 / 댓글 / 베팅 / 재판결과 / 재판종료(베팅결과). 알림 생성은 프론트가 아니라
DB 트리거가 담당하도록 설계했고, 아직 백엔드에 없는 기능이라
`supabase/sql/003_notification_triggers.sql`을 요청 스펙으로 정리해뒀습니다
(적용 전까지는 알림함이 비어 있거나 에러 없이 조용히 실패합니다).

## 데모 모드 (로그인만 백엔드 없이 통과)

`src/lib/demo.ts` 맨 위의 `DEMO_MODE`로 제어합니다. 기본값은 `false`이고,
재판/베팅/댓글/알림 등은 `DEMO_MODE`와 무관하게 항상 실제 Supabase를 사용합니다.

- `DEMO_MODE = false` (현재값): 실제 Supabase 백엔드에 연결됩니다. 로그인이 필요하고,
  백엔드의 "Confirm email" 설정이 켜져 있으면 이메일 인증을 거쳐야 합니다. 회원가입
  500 P-COIN 지급은 가이드에 없는 기능이라 아직 백엔드에 없을 수 있고,
  `supabase/sql/004_signup_bonus.sql`을 요청 스펙으로 정리해뒀습니다.
- `DEMO_MODE = true`: 회원가입/로그인만 형식 검증 후 통과시키는 데모 세션을 씁니다
  (그 외 데이터는 여전히 실제 Supabase를 호출하므로, 실제 화면을 채우려면
  `supabase/sql/999_seed_sample_data.sql`로 샘플 사연/댓글/베팅을 심어두세요).

> ⚠️ 하단 베팅 시트의 빠른금액(1,000P·2,000P·전액)은 백엔드 베팅 상한(500)과 충돌합니다.
> 실제 연동 시 500 초과는 서버가 거절해요. (a) 상한을 올릴지 (b) 칩을 100/300/500 등으로
> 바꿀지 백엔드팀과 정하세요.

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

## 기획 문서(IA·기능명세서·플로우차트·발표자료) 대비 정합성

플로우차트의 전체 흐름(앱 실행 → 회원가입/로그인 → 홈 → 재판소 → 사연작성(배팅) →
피고인 동의 대기 → 자동취소 / 게시완료 → 투표 → 10표+동률 판정 → 최종판결·정산 →
리워드 교환)과 앱 구현이 일치합니다.

IA/명세서 항목 반영:
- 계정: 소셜 로그인(연동예정 표시) · 온보딩 · 추가정보(닉네임/약관) — 구현
- 홈: 출석체크 · 실시간 인기재판 · 베스트 판결 · 진행중 재판 바로가기 — 구현
- 재판소: 사연작성 · 리스트 · 검색 · **정렬(최신순/조회수순/마감임박순)** — 구현
- 판결/정산: 최종판결(투표수) · P-COIN 배분/정산(수수료 10%) — 구현
- 마이페이지: 프로필 · **내 사연 내역 · 배팅 내역 · P-COIN 지갑(잔액/히스토리) ·
  알림 목록** · 리워드 교환 · 알림 설정 — 구현
- 알림: 재판요청/재판성립/댓글/베팅/재판결과/재판종료 알림함, 안읽음 뱃지, 모두읽기 — 구현

남은 정합성 항목(선택, 발표 후 검토 권장):
- 홈 베스트판결 **일간/주간/월간** 토글, 홈 **피고인 동의 현황(원고/피고 양쪽)** 섹션 — 구현
- 마이페이지 프로필 **편집**, 고객센터(신고/제한) — 현재 자리표시
- **배팅 최소 500 vs 백엔드 상한 500 충돌**: 명세서/발표자료는 "최소 500 P-COIN"이지만
  백엔드 가이드는 베팅 1~500이 상한. 제품 방향(발표자료)대로 가려면 백엔드의 베팅 상한을
  올리는 협의가 필요. 데모 모드는 발표자료 기준(500/1,000/2,000/전액)으로 보여줌.
- 이미지 첨부 **마스킹**·서버 업로드(Supabase Storage), 보상형 광고(출석 배율) — 향후
