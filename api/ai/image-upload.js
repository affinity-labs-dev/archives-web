import { requireUser } from '../_lib/auth.js';
import { handler, json, methodNotAllowed } from '../_lib/http.js';
import { UpstreamError } from '../_lib/supabase.js';

// POST /api/ai/image-upload
//
// The one thing the /api/db proxy cannot do. Storage is not PostgREST, and
// `getPublicUrl` is pure client-side string concatenation against the client's
// base URL - so through the proxy it would happily return a working-looking
// /api/db/storage/... URL that resolves to nothing.
//
// It also closes a hole that exists on the native path: AIStorageService.ts:97
// builds the object key from a userId the caller passes in, so the key is
// whatever the client says it is. Here it comes from the verified token.

const BUCKET = 'ai-images';
const TYPES = new Set(['generated', 'edited', 'uploaded']);

// Base64 is ~4/3 the size of the bytes, so this is roughly a 6MB image -
// comfortably above anything the generator produces and bounded, which an
// unauthenticated-by-size upload endpoint into a public bucket needs to be.
const MAX_BASE64_LENGTH = 8 * 1024 * 1024;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['POST'])) return;

  const userId = await requireUser(req);

  const { base64, type } = req.body || {};
  if (typeof base64 !== 'string' || !base64) {
    return json(res, 400, { error: 'Expected base64 image data' });
  }
  if (base64.length > MAX_BASE64_LENGTH) {
    return json(res, 413, { error: 'Image too large' });
  }
  if (!TYPES.has(type)) {
    return json(res, 400, { error: `type must be one of ${[...TYPES].join(', ')}` });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  }

  // Same key layout as native (AIStorageService.ts:97), so both platforms write
  // into one namespace - but scoped to the token's subject rather than to a
  // client-supplied id.
  const key = `${userId}/${Date.now()}_${type}.png`;

  let bytes;
  try {
    bytes = Buffer.from(base64, 'base64');
  } catch {
    return json(res, 400, { error: 'Malformed base64' });
  }
  if (!bytes.length) return json(res, 400, { error: 'Malformed base64' });

  const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'image/png',
      // Matches the native call's `upsert: false`. Timestamped keys make a
      // collision essentially impossible, so a conflict means something is
      // wrong and should surface rather than overwrite.
      'x-upsert': 'false',
    },
    body: bytes,
  });

  if (!upload.ok) {
    const detail = await upload.text().catch(() => '');
    throw new UpstreamError(`storage upload ${upload.status}: ${detail.slice(0, 200)}`);
  }

  // The bucket is public, so this is the same URL getPublicUrl builds - just
  // built where the real Supabase origin is known.
  json(res, 200, { publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}` });
});
