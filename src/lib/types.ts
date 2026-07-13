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
  invite_token: string | null;
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
}

// 성립 최소 득표수 (디자인: "성립기준 10표")
export const MIN_VOTES_TO_SETTLE = 10;

// 베팅 규칙 (가이드 4장 코인 규칙)
export const BET_MIN = 1;
export const BET_MAX = 500;

// 앱 수수료 (가이드: 승자 90% / 앱 10%)
export const APP_FEE_RATE = 0.1;
