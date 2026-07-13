import type { Choice, CoinLedgerEntry, Profile, Trial } from './types';

/**
 * ⚠️ 데모 모드
 *  true  → 로그인/백엔드 없이 목업 데이터로 모든 화면을 볼 수 있음 (발표 시연용)
 *  false → 실제 Supabase 백엔드에 연결 (로그인 필요)
 *
 * 발표 전 실제 연동으로 넘어갈 때 이 값만 false 로 바꾸면 됩니다.
 */
export const DEMO_MODE = true;

export const DEMO_USER = { id: 'demo-user', nickname: '익명의판사' };

const now = Date.now();
const inDays = (d: number) => new Date(now + d * 86_400_000).toISOString();
const agoDays = (d: number) => new Date(now - d * 86_400_000).toISOString();

// 재판별 "내 베팅/배당" (정산 화면용)
type MyBet = { choice: Choice; amount: number; payout: number };

// 데모 상태 (베팅하면 코인/득표가 실제로 갱신되도록 mutable)
export const demoState: {
  coin: number;
  trials: Trial[];
  myBets: Record<number, MyBet>;
} = {
  coin: 1240,
  myBets: {
    // 판결 화면 예시: 원고(A)에 500 걸었으나 피고(B) 승 → 배당 0
    12300: { choice: 'A', amount: 500, payout: 0 },
  },
  trials: [
    {
      id: 12345,
      title: '[연애] 3년 사귄 남친이 제 생일을 두 번 연속 까먹었어요',
      story:
        '3년 사귄 남친이 제 생일을 두 번 연속 까먹었어요. 이거 헤어질 사유 될까요...',
      option_a: '원고 승',
      option_b: '피고 승',
      stake: 500,
      status: 'OPEN',
      invite_token: null,
      winner: null,
      created_at: agoDays(1),
      closes_at: inDays(6),
      votes_a: 4,
      votes_b: 3,
      total_votes: 7,
      total_bet: 3500,
    },
    {
      id: 12300,
      title: '[연애] 소개팅 후 3일 만에 연락 끊은 상대, 잠수 이별인가요?',
      story:
        '소개팅에서 분위기 좋았는데 3일 만에 연락이 뚝 끊겼어요. 제가 뭘 잘못한 걸까요, 아니면 그쪽이 무례한 걸까요?',
      option_a: '원고 승',
      option_b: '피고 승',
      stake: 500,
      status: 'SETTLED',
      invite_token: null,
      winner: 'B',
      created_at: agoDays(3),
      closes_at: agoDays(1),
      votes_a: 4,
      votes_b: 8,
      total_votes: 12,
      total_bet: 6000,
    },
    {
      id: 12346,
      title: '[가족] 명절에 시댁 큰집만 가는 거 불공평하지 않나요?',
      story: '결혼 후 매 명절 시댁 큰집만 들르고 친정은 늘 뒷전이에요...',
      option_a: '원고 승',
      option_b: '피고 승',
      stake: 300,
      status: 'OPEN',
      invite_token: null,
      winner: null,
      created_at: agoDays(1),
      closes_at: inDays(2),
      votes_a: 6,
      votes_b: 5,
      total_votes: 11,
      total_bet: 4200,
    },
    {
      id: 12347,
      title: '[친구] 10년 지기 결혼식 축의금, 얼마가 적당한가요?',
      story: '10년 넘게 본 친구 결혼식인데 축의금 액수로 고민 중이에요...',
      option_a: '원고 승',
      option_b: '피고 승',
      stake: 200,
      status: 'PENDING',
      invite_token: 'demo-token',
      winner: null,
      created_at: agoDays(0),
      closes_at: null,
      votes_a: 0,
      votes_b: 0,
      total_votes: 0,
      total_bet: 0,
    },
  ],
};

export const DEMO_PROFILE = (): Profile => ({
  id: DEMO_USER.id,
  nickname: DEMO_USER.nickname,
  coin: demoState.coin,
});

export function demoLedger(): CoinLedgerEntry[] {
  const entries: CoinLedgerEntry[] = [];
  let id = 1;
  for (const [trialId, b] of Object.entries(demoState.myBets)) {
    entries.push({
      id: id++,
      user_id: DEMO_USER.id,
      amount: -b.amount,
      reason: '베팅',
      trial_id: Number(trialId),
      created_at: agoDays(2),
    });
    if (b.payout > 0) {
      entries.push({
        id: id++,
        user_id: DEMO_USER.id,
        amount: b.payout,
        reason: '베팅 보상',
        trial_id: Number(trialId),
        created_at: agoDays(1),
      });
    }
  }
  return entries;
}

// 데모: 베팅 처리 (코인 차감 + 득표 반영 + 내 베팅 기록)
export function demoPlaceBet(trialId: number, choice: Choice, amount: number) {
  demoState.coin = Math.max(0, demoState.coin - amount);
  const t = demoState.trials.find((x) => x.id === trialId);
  if (t) {
    if (choice === 'A') t.votes_a = (t.votes_a ?? 0) + 1;
    else t.votes_b = (t.votes_b ?? 0) + 1;
    t.total_votes = (t.total_votes ?? 0) + 1;
    t.total_bet = (t.total_bet ?? 0) + amount;
  }
  demoState.myBets[trialId] = { choice, amount, payout: 0 };
}

// 데모: 재판 생성
export function demoCreateTrial(input: {
  title: string;
  story: string;
  stake: number;
}): number {
  const id = 12000 + Math.floor(Math.random() * 900) + 100;
  demoState.trials.unshift({
    id,
    title: input.title,
    story: input.story,
    option_a: '원고 승',
    option_b: '피고 승',
    stake: input.stake,
    status: 'PENDING',
    invite_token: `demo-token-${id}`,
    winner: null,
    created_at: new Date().toISOString(),
    closes_at: null,
    votes_a: 0,
    votes_b: 0,
    total_votes: 0,
    total_bet: 0,
  });
  demoState.coin = Math.max(0, demoState.coin - input.stake);
  return id;
}
