import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper für Route-Handler, der sowohl synchrone Ausnahmen als auch abgelehnte
 * Promises abfängt und an die zentrale Fehler-Middleware weiterreicht.
 *
 * Express 4 fängt synchrone `throw`s bereits selbst ab; asynchrone Rejections
 * jedoch nicht. Dieser Wrapper vereinheitlicht beides, sodass Handler einfach
 * typisierte Fehler werfen können, ohne überall `try/catch` zu benötigen.
 */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = handler(req, res, next) as unknown;
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}
