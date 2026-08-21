import crypto from 'crypto';
import { User, UserRole, UserOrganizationMembership } from '../src/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'insight_arcs_enterprise_sec_key_2026_x89f_de_compliant';
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 Days

export interface JwtTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  orgId: string;
  orgName?: string;
  memberships?: UserOrganizationMembership[];
  iat: number;
  exp: number;
  iss: string;
  jti: string; // unique token ID
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Generates a signed JWT token with HMAC-SHA256
 */
export function generateJwtToken(user: User, orgId: string, orgName?: string): { token: string; payload: JwtTokenPayload } {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    orgId: orgId || user.orgId,
    orgName: orgName || 'Insight Arcs GmbH',
    memberships: user.memberships,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
    iss: 'insight-arcs-auth-engine',
    jti: crypto.randomBytes(16).toString('hex')
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const token = `${encodedHeader}.${encodedPayload}.${signature}`;

  return { token, payload };
}

/**
 * Verifies a JWT token signature, expiration and issuer
 */
export function verifyJwtToken(token: string): { valid: boolean; payload?: JwtTokenPayload; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token fehlt oder ungültig' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Ungültige Tokenstruktur' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return { valid: false, error: 'Digitale Token-Signatur ist ungültig (Manipulationsversuch erkannt)' };
  }

  try {
    const payload: JwtTokenPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Sitzungs-Token ist abgelaufen. Bitte erneut anmelden.' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Fehler beim Dekodieren der Token-Payload' };
  }
}
