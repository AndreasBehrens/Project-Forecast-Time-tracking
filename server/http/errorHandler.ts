import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, NotFoundError } from './errors.js';
import { formatZodIssues } from './validate.js';

/**
 * Antwortformat. `error` bleibt bewusst ein String (Rückwärtskompatibilität mit
 * dem bestehenden Frontend, das `data.error` als Text erwartet). Ergänzt um einen
 * maschinenlesbaren `code` und optionale feldbezogene `details`.
 */
interface ErrorResponseBody {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * 404-Handler für nicht existierende API-Routen. Muss NACH allen API-Routen und
 * VOR dem SPA-Catch-All registriert werden, damit unbekannte `/api/*`-Pfade eine
 * saubere JSON-404 statt der index.html liefern.
 */
export function apiNotFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new NotFoundError(`Route nicht gefunden: ${req.method} ${req.originalUrl}`));
}

/**
 * Zentrale Fehler-Middleware. Übersetzt geworfene Fehler in eine einheitliche
 * JSON-Struktur und passende HTTP-Statuscodes:
 *  - {@link AppError}      -> statusCode/code/details des Fehlers
 *  - {@link ZodError}      -> 422 VALIDATION_ERROR mit Feld-Details
 *  - CORS-Ablehnung        -> 403 CORS_FORBIDDEN
 *  - alles andere          -> 500 INTERNAL_ERROR (Details nur im Log)
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  // Bereits gesendete Header -> an Express-Default delegieren
  if (res.headersSent) {
    return;
  }

  let body: ErrorResponseBody;
  let statusCode: number;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    body = { error: err.message, code: err.code, details: err.details };
  } else if (err instanceof ZodError) {
    statusCode = 422;
    body = {
      error: 'Validierungsfehler',
      code: 'VALIDATION_ERROR',
      details: formatZodIssues(err),
    };
  } else if (err instanceof Error && /^CORS:/.test(err.message)) {
    statusCode = 403;
    body = { error: err.message, code: 'CORS_FORBIDDEN' };
  } else {
    statusCode = 500;
    const message = err instanceof Error ? err.message : 'Interner Serverfehler';
    body = { error: 'Interner Serverfehler', code: 'INTERNAL_ERROR' };
    // Unerwartete Fehler immer serverseitig protokollieren.
    console.error('[UNHANDLED ERROR]', message, err instanceof Error ? err.stack : err);
  }

  if (statusCode >= 500) {
    console.error(`[ERROR ${statusCode}] ${body.code}: ${body.error}`);
  }

  res.status(statusCode).json(body);
}
