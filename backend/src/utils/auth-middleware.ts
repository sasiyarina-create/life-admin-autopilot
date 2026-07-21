import type { NextFunction, Request, Response } from 'express';

export function requireAuthentication(request: Request, response: Response, next: NextFunction): void {
  if (!request.session.user) {
    response.status(401).json({ message: 'Please sign in to continue.' });
    return;
  }
  next();
}
