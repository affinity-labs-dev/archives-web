import { supabase } from '@/hooks/lib/supabase';
import { decode } from 'base64-arraybuffer';

/**
 * Uploads a PNG to Supabase Storage and returns its public URL.
 *
 * Extracted from AIStorageService.uploadImage so that only this one method
 * needs a web variant. Storage is the one part of the data layer the web
 * PostgREST proxy cannot carry: it is a different API, and `getPublicUrl` is
 * client-side string concatenation against the client's own base URL, so
 * through a proxy it returns a plausible URL that resolves to nothing.
 *
 * This native path is unchanged from what AIStorageService did inline.
 */
export async function uploadAiImage(
  bucket: string,
  userId: string,
  base64Data: string,
  type: 'generated' | 'edited' | 'uploaded'
): Promise<string | null> {
  const filename = `${userId}/${Date.now()}_${type}.png`;
  const arrayBuffer = decode(base64Data);

  const { data, error } = await supabase.storage.from(bucket).upload(filename, arrayBuffer, {
    contentType: 'image/png',
    upsert: false,
  });

  if (error) {
    console.error('❌ [AIStorage] Upload error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}
