import { supabase } from '@/lib/supabase';

export interface Reward {
  id: number;
  name: string;
  brand: string;
  cost: number;
  category: string;
  color: string;
}

export interface RewardRedemption {
  id: number;
  cost: number;
  created_at: string;
  reward: Reward;
}

// ── 읽기: 교환 가능한 리워드 목록 ───────────────────────────────────
export async function listRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('id, name, brand, cost, category, color')
    .eq('active', true)
    .order('cost', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Reward[];
}

// ── 읽기: 내 교환 내역 ───────────────────────────────────────────
export async function listMyRedemptions(userId: string): Promise<RewardRedemption[]> {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('id, cost, created_at, reward:rewards(id, name, brand, cost, category, color)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RewardRedemption[];
}

// ── 쓰기: 리워드 교환 (rpc redeem_reward) ───────────────────────────
export async function redeemReward(rewardId: number): Promise<void> {
  const { error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId });
  if (error) throw error;
}
