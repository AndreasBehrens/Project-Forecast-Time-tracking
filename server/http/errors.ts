/**
 * Zentrale, typisierte Fehlerklassen für die HTTP-Schicht.
 *
 * Alle bewusst geworfenen Anwendungsfehler erben von {@link AppError} und tragen
 * einen HTTP-Statuscode sowie einen stabilen, maschinenlesbaren Fehlercode. Die
 * zentrale Fehler-Middleware ({@link ./errorHandler}) übersetzt sie in eine
 * einheitliche JSON-Antwort:
 *
 *   { "error": { "code": "NOT_FOUND", "message": "…", "details"?: … } }
 */

export type ErrorDetails = unknown;

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetails;
  /** Kennzeichnet erwartete (fachliche) Fehler – für Logging vs. 500er. */
  public readonly isOperational: boolean = true;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: ErrorDetails) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

/** 400 – Ungültige Anfrage (fehlerhafte Parameter/Body jenseits der Schema-Validierung). */
export class BadRequestError extends AppError {
  constructor(message = 'Ungültige Anfrage', details?: ErrorDetails) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

/** 422 – Validierungsfehler (Schema-/Feldvalidierung, i. d. R. aus Zod). */
export class ValidationError extends AppError {
  constructor(message = 'Validierungsfehler', details?: ErrorDetails) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

/** 401 – Nicht authentifiziert. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Nicht authentifiziert', details?: ErrorDetails) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

/** 403 – Authentifiziert, aber nicht berechtigt. */
export class ForbiddenError extends AppError {
  constructor(message = 'Zugriff verweigert', details?: ErrorDetails) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

/** 404 – Ressource nicht gefunden. */
export class NotFoundError extends AppError {
  constructor(message = 'Ressource nicht gefunden', details?: ErrorDetails) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

/** 409 – Konflikt (z. B. gesperrte Periode, verletzte Invariante). */
export class ConflictError extends AppError {
  constructor(message = 'Konflikt mit dem aktuellen Zustand', details?: ErrorDetails) {
    super(message, 409, 'CONFLICT', details);
  }
}
