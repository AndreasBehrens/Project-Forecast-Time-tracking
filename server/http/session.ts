import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Request as ExpressJwtRequest } from 'express-jwt';
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
  /** Ermittelt den handelnden Benutzer aus den bereits verifizierten JWT-Claims. */
  getActorId(req: Request): string;
  /** Middleware: erzwingt einen gültigen API-Key für die externe API (/api/v1). */
  requireApiKey: RequestHandler;
  /** Middleware: protects admin routes using the current stored role. */
  requireAdminAuth: RequestHandler;
  /** Middleware: requires a valid JWT belonging to an active user. */
  requireAuthenticatedUser: RequestHandler;
}

export function createSessionContext(): SessionContext {
  const getActorId = (req: Request): string => {
    const userId = (req as ExpressJwtRequest).auth?.userId;
    return typeof userId === 'string' ? userId : '';
  };

  const requireAuthenticatedUser: RequestHandler = (req, res, next) => {
    const actorId = getActorId(req);
    if (!actorId || !storage.getUsers(true).some(user => user.id === actorId)) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }
    next();
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
        const roleInfo = storage.getActorRoleInfo(verified.payload.userId);
        if (roleInfo.user && (roleInfo.isAdmin || roleInfo.isSuperAdmin)) {
          return next();
        }
        return res.status(403).json({ error: 'Forbidden' });
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(401).json({ error: 'Unauthorized' });
  };

  return {
    getActorId,
    requireApiKey,
    requireAdminAuth,
    requireAuthenticatedUser,
  };
}
