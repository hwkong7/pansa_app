/**
 * 백엔드(Supabase) 데이터 타입.
 * 가이드 4장의 상태 흐름/코인 규칙을 기준으로 정의.
 *
 * NOTE: trials 테이블의 정확한 컬럼명은 백엔드 담당자와 최종 확인 필요.
 * 여기서는 가이드 예시(create_trial 반환/select('*'))를 근거로 추정한 필드를 둔다.
 * 없는 컬럼은 옵셔널(?)로 두어 런타임에서 안전하게 처리한다.
 */

// 재판 상태: 가이드 4장 상태 흐름
//  PENDING → (피고 수락) → OPEN → (24h) → SETTLED
//          → (거절 or 48h 무응답) → REJECTED
export type TrialStatus = 'PENDING' | 'OPEN' | 'SETTLED' | 'REJECTED';

// 선택지: 원고(A) / 피고(B)
export type Choice = 'A' | 'B';

export interface Trial {
  id: number;
  title: string;
  story: string;
  option_a: string; // 예: "원고 승"
  option_b: string; // 예: "피고 승"
  stake: number; // 판돈
  status: TrialStatus;
  invite_token?: string | null; // 레거시(초대 링크 방식). 실제 연동에선 defendant_id로 대체돼 안 씀
  winner: Choice | null; // null && SETTLED = 무승부(전원 환불)
  created_at: string;
  closes_at?: string | null; // OPEN 상태에서 카운트다운에 사용

  // 아래는 스키마에 있을 수도/없을 수도 있는 추정 필드 (방어적으로 옵셔널)
  plaintiff_id?: string | null;
  defendant_id?: string | null;
  votes_a?: number | null; // 원고 득표수(사람 수)
  votes_b?: number | null; // 피고 득표수(사람 수)
  total_votes?: number | null;
  total_bet?: number | null; // 총 베팅액
  photo_uri?: string | null; // 첨부 사진 (레거시 단일 필드, 하위호환용)
  photo_uris?: string[] | null; // 첨부 사진 여러 장 (데모: 로컬 uri 배열)
  deleted?: boolean; // 성립 실패로 삭제 처리된 재판 (목록에서 제외)
  view_count?: number | null; // 조회수 (상세화면 진입 시 +1)
  comment_count?: number | null; // 댓글 수 (add_comment 시 +1, 비정규화 카운터)
  voting_days?: number | null; // 작성 시 선택한 투표 기간(일). 피고 수락 시점부터 적용
  category?: string | null; // 연애/학업/가족/친구/기타 등 — 실제 컬럼(과거엔 title 접두어로 인코딩했음)
}

// 재판의 첨부 사진 목록 조회 (photo_uris 우선, 없으면 레거시 photo_uri로 폴백)
export function getTrialPhotos(trial: Pick<Trial, 'photo_uri' | 'photo_uris'>): string[] {
  if (trial.photo_uris?.length) return trial.photo_uris;
  if (trial.photo_uri) return [trial.photo_uri];
  return [];
}

// 코인 원장 (내역)
export interface CoinLedgerEntry {
  id: number;
  user_id: string;
  amount: number; // +획득 / -사용
  reason?: string | null; // 예: "재판 판돈", "베팅", "베팅 보상", "환불"
  trial_id?: number | null;
  created_at: string;
}

export interface Profile {
  id: string;
  nickname?: string | null;
  coin: number;
  photo_uri?: string | null; // 프로필 사진
  checkin_streak?: number | null; // 출석체크 연속일수
  last_checkin_at?: string | null; // 마지막 출석체크 날짜 (YYYY-MM-DD)
}

// 댓글 (재판 상세화면 + 마이페이지 '내 댓글 내역')
export interface Comment {
  id: number;
  trial_id: number;
  user_id: string;
  text: string;
  created_at: string;
  // 작성자 프로필(닉네임/사진) — profiles 조인 시 채워짐. 조인 안 되면 undefined.
  author?: { nickname: string | null; photo_uri: string | null } | null;
}

// 알림 종류
//  TRIAL_REQUEST   : 새 동의요청 도착 (내가 피고로 지정됨)
//  TRIAL_STARTED   : 재판성립 (상대가 수락해서 OPEN 시작)
//  COMMENT         : 내 재판에 댓글 (⚠️ 현재 백엔드에 댓글 기능 자체가 없어 미사용)
//  BET             : 내 재판에 베팅이 들어옴
//  RESULT          : 재판결과 확정 (SETTLED)
//  BET_SETTLED     : 재판종료(내 베팅 정산 결과)
export type NotificationType =
  | 'TRIAL_REQUEST'
  | 'TRIAL_STARTED'
  | 'COMMENT'
  | 'BET'
  | 'RESULT'
  | 'BET_SETTLED';

// ⚠️ 백엔드에 아직 notifications 테이블이 없다(가이드 문서 기준). 이 타입은 신설을
// 요청할 스키마 초안이며, 테이블이 생기기 전까진 api/notifications.ts가 빈 배열을 반환한다.
export interface Notification {
  id: number;
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  trial_id?: number | null;
  is_read: boolean;
  created_at: string;
}

// 성립 최소 득표수 (디자인: "성립기준 10표")
export const MIN_VOTES_TO_SETTLE = 10;

// 베팅 규칙 (가이드 4장 코인 규칙)
export const BET_MIN = 1;
export const BET_MAX = 500;

// 사연 작성 시 판돈 최소값
export const TRIAL_MIN_STAKE = 50;

// 투표 마감일 프리셋(일) 및 기본값
export const VOTING_DAYS_OPTIONS = [1, 3, 7] as const;
export const DEFAULT_VOTING_DAYS = 3;

// 앱 수수료 (가이드: 승자 90% / 앱 10%)
export const APP_FEE_RATE = 0.1;
