import type { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodTypeAny } from 'zod';
import { ValidationError } from './errors.js';

export interface FieldIssue {
  field: string;
  message: string;
}

/** Wandelt einen ZodError in eine kompakte, feldbezogene Liste um. */
export function formatZodIssues(error: ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Validiert `req.body` gegen ein Zod-Schema. Bei Erfolg wird `req.body` durch
 * die geparsten (inkl. Defaults transformierten) Daten ersetzt. Bei Misserfolg
 * wird eine {@link ValidationError} (HTTP 422) mit feldbezogenen Details geworfen,
 * die die zentrale Fehler-Middleware einheitlich ausgibt.
 */
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = formatZodIssues(result.error);
      throw new ValidationError(
        `Validierungsfehler: ${issues.map((i) => i.message).join(', ')}`,
        issues
      );
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validiert `req.query` gegen ein Zod-Schema (ohne Ersetzung, da Express-Query
 * schreibgeschützt sein kann). Gibt die geparsten Werte an den Handler via
 * `res.locals.query` weiter.
 */
export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw new ValidationError(
        `Ungültige Abfrageparameter`,
        formatZodIssues(result.error)
      );
    }
    res.locals.query = result.data;
    next();
  };
}

export { z };
