import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/upload';

export type InquiryStatus = 'OPEN' | 'ANSWERED';

export interface Inquiry {
  id: number;
  category: string;
  title: string;
  content: string;
  image_uris: string[] | null;
  status: InquiryStatus;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

// ── 쓰기: 1:1 문의 등록 (rpc create_inquiry) ─────────────────────────
export async function createInquiry(input: {
  category: string;
  title: string;
  content: string;
  photoUris?: string[] | null;
}): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const uris = input.photoUris ?? [];
  const photoUrls = await Promise.all(
    uris.map((uri, idx) => uploadImage(user.id, uri, `inquiry-${Date.now()}-${idx}`))
  );

  const { data, error } = await supabase.rpc('create_inquiry', {
    p_category: input.category,
    p_title: input.title,
    p_content: input.content,
    p_image_uris: photoUrls.length > 0 ? photoUrls : null,
  });
  if (error) throw error;
  return data as number;
}

// ── 읽기: 내 문의 내역 ───────────────────────────────────────────
export async function listMyInquiries(userId: string): Promise<Inquiry[]> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Inquiry[];
}

// ── 읽기: 문의 단건 ───────────────────────────────────────────────
export async function getInquiry(id: number): Promise<Inquiry> {
  const { data, error } = await supabase.from('inquiries').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Inquiry;
}
