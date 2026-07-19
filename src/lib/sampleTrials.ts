import type { Trial } from './types';

/**
 * 하드코딩 샘플 사연.
 *
 * 실제 백엔드에 아직 데이터가 없어서(신규 프로젝트) 홈/재판소 피드가 텅 비어 보이는 문제를
 * 해결하려고 넣어둔 "가이드용" 고정 콘텐츠다. DEMO_MODE 와 무관하게(즉, 실제 로그인/재판
 * 생성/수락/조회 전부 그대로 실제 백엔드로 동작하는 상태에서) 읽기 목록에만 곁들여 보여준다.
 *
 * id 는 실제 DB의 bigint identity(양수)와 절대 충돌하지 않도록 음수로 고정한다.
 * api/trials.ts 의 listTrials/getTrial/subscribeTrial, api/bets.ts 의 placeBet 이
 * 이 id 대역(음수)을 보고 실제 DB 대신 이 배열을 사용하도록 분기한다.
 */
const now = Date.now();
const inDays = (d: number) => new Date(now + d * 86_400_000).toISOString();
const agoDays = (d: number) => new Date(now - d * 86_400_000).toISOString();

export const SAMPLE_TRIALS: Trial[] = [
  {
    id: -1,
    title: '[연애] 3년 사귄 남친이 제 생일을 두 번 연속 까먹었어요',
    story: '3년 사귄 남친이 제 생일을 두 번 연속 까먹었어요. 이거 헤어질 사유 될까요...',
    option_a: '원고 승',
    option_b: '피고 승',
    stake: 500,
    status: 'OPEN',
    winner: null,
    created_at: agoDays(1),
    closes_at: inDays(6),
    votes_a: 4,
    votes_b: 3,
    total_votes: 7,
    total_bet: 3500,
    view_count: 128,
  },
  {
    id: -2,
    title: '[가족] 명절에 시댁 큰집만 가는 거 불공평하지 않나요?',
    story: '결혼 후 매 명절 시댁 큰집만 들르고 친정은 늘 뒷전이에요...',
    option_a: '원고 승',
    option_b: '피고 승',
    stake: 500,
    status: 'OPEN',
    winner: null,
    created_at: agoDays(1),
    closes_at: inDays(2),
    votes_a: 5,
    votes_b: 4,
    total_votes: 9,
    total_bet: 4200,
    view_count: 96,
  },
  {
    id: -3,
    title: '[연애] 소개팅 후 3일 만에 연락 끊은 상대, 잠수 이별인가요?',
    story:
      '소개팅에서 분위기 좋았는데 3일 만에 연락이 뚝 끊겼어요. 제가 뭘 잘못한 걸까요, 아니면 그쪽이 무례한 걸까요?',
    option_a: '원고 승',
    option_b: '피고 승',
    stake: 500,
    status: 'SETTLED',
    winner: 'B',
    created_at: agoDays(3),
    closes_at: agoDays(1),
    votes_a: 4,
    votes_b: 8,
    total_votes: 12,
    total_bet: 6000,
    view_count: 340,
  },
];

export function isSampleTrialId(id: number): boolean {
  return id < 0;
}

export function getSampleTrial(id: number): Trial | null {
  return SAMPLE_TRIALS.find((t) => t.id === id) ?? null;
}
