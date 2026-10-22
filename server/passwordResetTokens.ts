import crypto from 'node:crypto';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

interface PasswordResetTokenRecord {
  userId: string;
  tokenDigest: string;
  expiresAt: number;
}

const resetTokensByUserId = new Map<string, PasswordResetTokenRecord>();

function digestToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createPasswordResetToken(userId: string): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;
  resetTokensByUserId.set(userId, { userId, tokenDigest: digestToken(token), expiresAt });
  return { token, expiresAt };
}

export function consumePasswordResetToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;

  const candidateDigest = digestToken(token);
  const now = Date.now();
  for (const [userId, record] of resetTokensByUserId) {
    if (record.expiresAt <= now) {
      resetTokensByUserId.delete(userId);
      continue;
    }
    const expected = Buffer.from(record.tokenDigest, 'hex');
    const candidate = Buffer.from(candidateDigest, 'hex');
    if (expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate)) {
      resetTokensByUserId.delete(userId);
      return userId;
    }
  }
  return null;
}

export function clearPasswordResetToken(userId: string): void {
  resetTokensByUserId.delete(userId);
}
