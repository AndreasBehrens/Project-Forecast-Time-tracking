import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { storage } from '../storage.js';
import { verifyJwtToken } from '../authService.js';

/**
 * Kapselt die (simulierte) Session- und Authentifizierungslogik.
 *
 * Zuvor lagen `currentUserId`, `getActorId`, `requireApiKey` und
 * `requireAdminAuth` als lose Closures im monolithischen `server.ts`. Sie sind
 * hier zu einer klar abgegrenzten, wiederverwendbaren Einheit zusammengefasst
 * (Trennung der Belange: Auth-/Session-Schicht vs. Routen-Controller).
 */
export interface SessionContext {
  getCurrentUserId(): string;
  setCurrentUserId(userId: string): void;
  clearCurrentUser(): void;
  /** Ermittelt den handelnden Benutzer (Bearer-Token > x-user-id > Session-Default). */
  getActorId(req: Request): string;
  /** Middleware: erzwingt einen gültigen API-Key für die externe API (/api/v1). */
  requireApiKey: RequestHandler;
  /** Middleware: schützt Admin-Routen (nur ADMIN/SUPERADMIN via JWT oder Session). */
  requireAdminAuth: RequestHandler;
}

export function createSessionContext(defaultUserId = 'u-1'): SessionContext {
  // Simulierte Session: aktuell "eingeloggter" Benutzer (Default: Admin).
  let currentUserId: string = defaultUserId;

  const getActorId = (req: Request): string => {
    // 1. JWT-Bearer-Token prüfen
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const verified = verifyJwtToken(token);
      if (verified.valid && verified.payload) {
        return verified.payload.userId;
      }
    }
    // 2. Fallback: Header oder Session
    const headerUserId = req.headers['x-user-id'] as string;
    return headerUserId || currentUserId || 'u-1';
  };

  const requireApiKey: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = (req.headers['x-api-key'] as string) || (req.headers['authorization']?.replace('Bearer ', ''));
    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized: API Key missing',
        message: 'Please provide a valid x-api-key header or Bearer token'
      });
    }
    if (!storage.validateApiKey(apiKey)) {
      return res.status(403).json({
        error: 'Forbidden: Invalid or revoked API Key',
        message: 'The provided API key is invalid or has been revoked.'
      });
    }
    next();
  };

  const requireAdminAuth: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    // a) Bearer-Token im Authorization-Header prüfen
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      let verified: ReturnType<typeof verifyJwtToken>;
      try {
        verified = verifyJwtToken(token);
      } catch {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (verified.valid && verified.payload) {
        const role = verified.payload.role;
        if (role === 'ADMIN' || role === 'SUPERADMIN') {
          return next();
        }
        return res.status(403).json({ error: 'Forbidden' });
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // b) Fallback: Session über x-user-id-Header (nur explizit gesetzt).
    const sessionUserId = req.headers['x-user-id'] as string | undefined;
    if (sessionUserId) {
      const user = storage.getUsers().find((u) => u.id === sessionUserId);
      if (user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN')) {
        return next();
      }
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.status(401).json({ error: 'Unauthorized' });
  };

  return {
    getCurrentUserId: () => currentUserId,
    setCurrentUserId: (userId: string) => { currentUserId = userId; },
    clearCurrentUser: () => { currentUserId = ''; },
    getActorId,
    requireApiKey,
    requireAdminAuth,
  };
}
