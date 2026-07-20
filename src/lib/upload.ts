import { File } from 'expo-file-system';
import { supabase } from './supabase';

/**
 * 로컬 기기 사진(file://...)을 Supabase Storage의 공개 버킷("media")에 올리고
 * 공개 URL을 반환한다. 경로는 "<uid>/<filename>.<ext>" 형태(스토리지 RLS가
 * 첫 폴더명 = auth.uid() 인지로 소유자를 검사하므로 이 형태를 반드시 지켜야 함).
 */
export async function uploadImage(
  userId: string,
  localUri: string,
  filename: string
): Promise<string> {
  const ext = extFromUri(localUri);
  const path = `${userId}/${filename}.${ext}`;

  const file = new File(localUri);
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from('media')
    .upload(path, arrayBuffer, { contentType: contentTypeFromExt(ext), upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

function extFromUri(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return (match?.[1] ?? 'jpg').toLowerCase();
}

function contentTypeFromExt(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}
