# 이 폴더는 뭔가요

`create_trial` / `respond_to_trial` / `place_bet` / 피고인 유저 검색(`profiles.email`
조회)은 **이미 백엔드 담당자가 구축**해뒀습니다. 프론트는 그 함수들을 SQL로 다시
만들지 않고, 가이드 문서 그대로 `supabase.rpc(...)` / `supabase.from(...)`으로
호출만 합니다 (`src/api/trials.ts`, `src/api/bets.ts`).

이 폴더의 SQL 파일들은 **제가 직접 실행한 게 아니라**, 가이드 문서에는 없지만
이번에 새로 필요해진 기능(알림함, 실제 댓글 작성, 회원가입 코인 보상)을 위해
**백엔드 담당자에게 전달할 요청 스펙**입니다. 위 4개(이미 구축된) 함수는 이
파일들에서 전혀 건드리지 않습니다.

- `001_notifications_and_comment_count.sql` — 알림함용 `notifications` 테이블 +
  재판 카드 댓글 수 표시용 `trials.comment_count` 컬럼
- `002_comment_rpc.sql` — 댓글을 실제로 쓰기 위한 `add_comment` RPC
- `003_notification_triggers.sql` — 재판요청/성립/판결/베팅/댓글 발생 시 알림을
  자동으로 쌓는 트리거 + 읽음 처리 RPC 2개. `create_trial`/`respond_to_trial`/
  `place_bet`의 내부 로직은 안 건드리고, 그 함수들이 만든 결과(행 insert/상태
  변경)에 반응만 합니다.
- `004_signup_bonus.sql` — 회원가입 시 500코인 지급. ⚠️ 이미 auth.users →
  profiles를 만들어주는 트리거가 있을 가능성이 높으니, 새로 만들기 전에
  기존 트리거의 coin 기본값만 바꿔도 되는지 먼저 확인해달라고 요청하세요.
- `999_seed_sample_data.sql` — (선택) 샘플 사연/댓글/베팅 데이터, 우선순위 낮음.

## 백엔드 담당자 없이 그냥 실행해도 되나요?

`001~004`는 CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE 형태라 재실행은
안전하지만, 실제 `trials`/`profiles`/`bets` 컬럼명이 여기 추정한 것과 다르면
실패하거나 원치 않는 동작을 할 수 있습니다. 백엔드 담당자가 실제 스키마를 보고
검토한 뒤 적용하는 걸 권장합니다.
