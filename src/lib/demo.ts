import { MIN_VOTES_TO_SETTLE, type Choice, type CoinLedgerEntry, type Profile, type Trial } from './types';

/**
 * ⚠️ 데모 모드
 *  true  → 백엔드 없이 목업 데이터로 동작 (발표 시연용). 로그인은 형식만 검증하고 통과.
 *  false → 실제 Supabase 백엔드에 연결.
 */
export const DEMO_MODE = true;

export const DEMO_USER = { id: 'demo-user', nickname: '익명의판사' };

/* 데모 로그인 (백엔드 없이 통과) */
let _signedIn = false;
const _authListeners = new Set<() => void>();
export const demoAuth = {
  isSignedIn: () => _signedIn,
  signIn: () => {
    _signedIn = true;
    _authListeners.forEach((l) => l());
  },
  signOut: () => {
    _signedIn = false;
    _authListeners.forEach((l) => l());
  },
  subscribe: (cb: () => void) => {
    _authListeners.add(cb);
    return () => {
      _authListeners.delete(cb);
    };
  },
};

// 데모: 내가 작성한 재판(마이페이지 '내 사연 내역'용)
export const DEMO_MY_TRIAL_IDS = [12345, 12347];

const now = Date.now();
const inDays = (d: number) => new Date(now + d * 86_400_000).toISOString();
const agoDays = (d: number) => new Date(now - d * 86_400_000).toISOString();

type MyBet = { choice: Choice; amount: number; payout: number };
export type DemoComment = { id: number; nickname: string; text: string; created_at: string };

export const demoState: {
  coin: number;
  nickname: string;
  photoUri: string | null;
  trials: Trial[];
  myBets: Record<number, MyBet>;
  comments: Record<number, DemoComment[]>;
} = {
  coin: 1240,
  nickname: DEMO_USER.nickname,
  photoUri: null,
  myBets: {
    12300: { choice: 'A', amount: 500, payout: 0 },
  },
  comments: {
    12345: [
      { id: 1, nickname: '익명의배심원1', text: '생일 두 번은 좀... 원고 손 들어줍니다', created_at: agoDays(0) },
      { id: 2, nickname: '익명의배심원2', text: '바빴을 수도 있죠. 대화가 먼저인 듯', created_at: agoDays(0) },
    ],
  },
  trials: [
    {
      id: 12345,
      title: '[연애] 3년 사귄 남친이 제 생일을 두 번 연속 까먹었어요',
      story: '3년 사귄 남친이 제 생일을 두 번 연속 까먹었어요. 이거 헤어질 사유 될까요...',
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
      photo_uri: null,
      view_count: 128,
    },
    {
      id: 12300,
      title: '[연애] 소개팅 후 3일 만에 연락 끊은 상대, 잠수 이별인가요?',
      story: '소개팅에서 분위기 좋았는데 3일 만에 연락이 뚝 끊겼어요. 제가 뭘 잘못한 걸까요, 아니면 그쪽이 무례한 걸까요?',
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
      photo_uri: null,
      view_count: 340,
    },
    {
      id: 12346,
      title: '[가족] 명절에 시댁 큰집만 가는 거 불공평하지 않나요?',
      story: '결혼 후 매 명절 시댁 큰집만 들르고 친정은 늘 뒷전이에요...',
      option_a: '원고 승',
      option_b: '피고 승',
      stake: 500,
      status: 'OPEN',
      invite_token: null,
      winner: null,
      created_at: agoDays(1),
      closes_at: inDays(2),
      votes_a: 5,
      votes_b: 4,
      total_votes: 9,
      total_bet: 4200,
      photo_uri: null,
      view_count: 96,
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
      closes_at: inDays(1),
      votes_a: 0,
      votes_b: 0,
      total_votes: 0,
      total_bet: 0,
      photo_uri: null,
      view_count: 3,
    },
  ],
};

export const DEMO_PROFILE = (): Profile => ({
  id: DEMO_USER.id,
  nickname: demoState.nickname,
  coin: demoState.coin,
  photo_uri: demoState.photoUri,
});

// 데모: 닉네임 변경 (프로필 설정 화면)
export function demoUpdateNickname(nickname: string) {
  demoState.nickname = nickname;
}

// 데모: 프로필 사진 변경 (프로필 설정 화면)
export function demoUpdatePhoto(photoUri: string) {
  demoState.photoUri = photoUri;
}

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

// 데모: 베팅 처리 (투표 상한 체크 포함)
export function demoPlaceBet(trialId: number, choice: Choice, amount: number) {
  const t = demoState.trials.find((x) => x.id === trialId);
  if (t) {
    const total = (t.votes_a ?? 0) + (t.votes_b ?? 0);
    if (total >= MIN_VOTES_TO_SETTLE) {
      throw new Error('이미 투표 정원이 찼어요. 재판을 마감해주세요.');
    }
    if (choice === 'A') t.votes_a = (t.votes_a ?? 0) + 1;
    else t.votes_b = (t.votes_b ?? 0) + 1;
    t.total_votes = (t.total_votes ?? 0) + 1;
    t.total_bet = (t.total_bet ?? 0) + amount;
  }
  demoState.coin = Math.max(0, demoState.coin - amount);
  demoState.myBets[trialId] = { choice, amount, payout: 0 };
}

// 데모: 조회수 +1 (상세화면 진입 시)
export function demoIncrementView(trialId: number) {
  const t = demoState.trials.find((x) => x.id === trialId);
  if (t) t.view_count = (t.view_count ?? 0) + 1;
}

// 데모: 재판 종료 (과반 판정) → 'A' | 'B' | 'FAILED'
export function demoEndTrial(trialId: number): Choice | 'FAILED' {
  const t = demoState.trials.find((x) => x.id === trialId);
  if (!t) return 'FAILED';
  const a = t.votes_a ?? 0;
  const b = t.votes_b ?? 0;
  const total = a + b;

  if (total < MIN_VOTES_TO_SETTLE || a === b) {
    t.status = 'SETTLED';
    t.winner = null;
    t.deleted = true; // 홈/목록에서 삭제 처리
    return 'FAILED';
  }

  const winner: Choice = a > b ? 'A' : 'B';
  t.status = 'SETTLED';
  t.winner = winner;

  const my = demoState.myBets[trialId];
  if (my) {
    if (my.choice === winner) {
      const payout = my.amount + Math.round(my.amount * 0.9);
      my.payout = payout;
      demoState.coin += payout;
    } else {
      my.payout = 0;
    }
  }
  return winner;
}

// // 데모: 피고 수락/거절
// export function demoRespondToTrial(token: string, accept: boolean) {
//   const t = demoState.trials.find((x) => x.invite_token === token);
//   if (!t) return;
//   if (accept) {
//     t.status = 'OPEN';
//     t.closes_at = inDays(1);
//   } else {
//     t.status = 'REJECTED';
//   }
// }

// 데모: 댓글
export function demoGetComments(trialId: number): DemoComment[] {
  return demoState.comments[trialId] ?? [];
}
export function demoAddComment(trialId: number, text: string): DemoComment {
  const list = demoState.comments[trialId] ?? [];
  const c: DemoComment = {
    id: (list[list.length - 1]?.id ?? 0) + 1,
    nickname: DEMO_USER.nickname,
    text,
    created_at: new Date().toISOString(),
  };
  demoState.comments[trialId] = [...list, c];
  return c;
}

// 데모: 재판 생성 (사진 포함)
export function demoCreateTrial(input: {
  title: string;
  story: string;
  stake: number;
  photoUri?: string | null;
  votingDays?: number;
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
    closes_at: inDays(1),
    votes_a: 0,
    votes_b: 0,
    total_votes: 0,
    total_bet: 0,
    photo_uri: input.photoUri ?? null,
    view_count: 0,
    voting_days: input.votingDays ?? null,
  });
  demoState.coin = Math.max(0, demoState.coin - input.stake);
  return id;
}


// 데모: 내가 작성한 재판 목록
export function demoMyTrials(): Trial[] {
  return demoState.trials.filter((t) => DEMO_MY_TRIAL_IDS.includes(t.id));
}

// 데모: 내가 작성한 댓글 목록 (마이페이지 '내 댓글 내역'용)
export function demoMyComments(): { id: number; text: string; created_at: string; trial: Trial }[] {
  const rows: { id: number; text: string; created_at: string; trial: Trial }[] = [];
  for (const [trialId, list] of Object.entries(demoState.comments)) {
    const trial = demoState.trials.find((t) => t.id === Number(trialId));
    if (!trial) continue;
    for (const c of list) {
      if (c.nickname === DEMO_USER.nickname) {
        rows.push({ id: c.id, text: c.text, created_at: c.created_at, trial });
      }
    }
  }
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// 데모: 내 배팅 내역 (재판별)
export function demoMyBets(): { trial: Trial; choice: Choice; amount: number; payout: number; settled: boolean }[] {
  return Object.entries(demoState.myBets)
    .map(([trialId, b]) => {
      const trial = demoState.trials.find((t) => t.id === Number(trialId));
      if (!trial) return null;
      return { trial, choice: b.choice, amount: b.amount, payout: b.payout, settled: trial.status === 'SETTLED' };
    })
    .filter(Boolean) as any;
}

// 데모: 피고 수락/거절 → 상태 변경
//  수락 → OPEN(투표 시작, closes_at 24시간 뒤) / 거절 → REJECTED
export function demoRespondToTrial(token: string, accept: boolean) {
  const t = demoState.trials.find((x) => x.invite_token === token);
  if (!t) return;
  if (accept) {
    t.status = 'OPEN';
    t.closes_at = inDays(t.voting_days ?? 1);
  } else {
    t.status = 'REJECTED';
  }
}
