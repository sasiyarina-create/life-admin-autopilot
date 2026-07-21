import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error.js';
import { disconnectGmail, getGmailStatus, getGoogleAuthUrl, syncGmail, finishGoogleAuth } from '../services/gmail.service.js';
import { createAuthState } from '../services/auth.service.js';

export async function googleLogin(request: Request, response: Response): Promise<void> {
  const state = createAuthState();
  request.session.gmailAuthState = state;
  request.session.continueOnboarding = request.query.onboarding === '1';
  await new Promise<void>((resolve, reject) => {
    request.session.save((error) => error ? reject(error) : resolve());
  });
  response.redirect(getGoogleAuthUrl(state));
}
export async function googleCallback(request: Request, response: Response): Promise<void> {
  const code = typeof request.query.code === 'string' ? request.query.code : null;
  const state = typeof request.query.state === 'string' ? request.query.state : null;
  if (!code || !state || state !== request.session.gmailAuthState || !request.session.user) throw new AppError('Google authorization could not be verified. Please reconnect Gmail.', 400);
  delete request.session.gmailAuthState;
  const continueOnboarding = request.session.continueOnboarding;
  delete request.session.continueOnboarding;
  await finishGoogleAuth(code, request.session.user.email);
  response.redirect(continueOnboarding ? 'http://localhost:5173/welcome?step=3' : 'http://localhost:5173/settings?gmail=connected');
}
export async function gmailStatus(_request: Request, response: Response): Promise<void> { response.json(await getGmailStatus()); }
export async function gmailSync(_request: Request, response: Response): Promise<void> { response.json(await syncGmail()); }
export async function gmailDisconnect(_request: Request, response: Response): Promise<void> { await disconnectGmail(); response.status(204).end(); }
