import { getSupabaseToken } from '@/hooks/lib/supabase.web';

/**
 * Uploads a PNG through the backend rather than to Supabase Storage directly.
 *
 * The web build holds no Supabase credential, and storage is not PostgREST so
 * it cannot go through the /api/db proxy. `POST /api/ai/image-upload` does the
 * upload with the service key and returns the real public URL.
 *
 * `userId` is accepted so the signature matches the native sibling, but it is
 * deliberately not sent: the endpoint derives the object key from the verified
 * Clerk token instead. On native the key is whatever the caller passes, which
 * is a hole this side simply does not have.
 */
export async function uploadAiImage(
  _bucket: string,
  _userId: string,
  base64Data: string,
  type: 'generated' | 'edited' | 'uploaded'
): Promise<string | null> {
  try {
    const token = await getSupabaseToken();
    if (!token) {
      console.error('❌ [AIStorage] Not signed in');
      return null;
    }

    const res = await fetch('/api/ai/image-upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: base64Data, type }),
    });

    if (!res.ok) {
      console.error('❌ [AIStorage] Upload error:', res.status, await res.text().catch(() => ''));
      return null;
    }

    const { publicUrl } = await res.json();
    return publicUrl ?? null;
  } catch (error) {
    console.error('❌ [AIStorage] Upload failed:', error);
    return null;
  }
}
