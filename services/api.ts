// api.ts - Thin fetch wrapper for backend AI calls

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export class AIBackendError extends Error {
  code: string;
  quotaRemaining?: Record<string, number>;
  resetDate?: string;

  constructor(code: string, message: string, quotaRemaining?: Record<string, number>, resetDate?: string) {
    super(message);
    this.code = code;
    this.quotaRemaining = quotaRemaining;
    this.resetDate = resetDate;
  }
}

/**
 * Make an authenticated request to the AI backend.
 * Automatically attaches the Clerk JWT token.
 */
export async function aiRequest<T>(
  path: string,
  body: object,
  getToken: () => Promise<string | null>
): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new AIBackendError('UNAUTHORIZED', 'Not signed in');
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorData: any;
    try {
      errorData = await res.json();
    } catch {
      errorData = { code: 'UNKNOWN', message: `HTTP ${res.status}` };
    }

    throw new AIBackendError(
      errorData.code || 'UNKNOWN',
      errorData.message || `Request failed with status ${res.status}`,
      errorData.quotaRemaining,
      errorData.resetDate
    );
  }

  return res.json();
}
