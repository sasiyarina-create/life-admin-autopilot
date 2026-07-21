import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error.js';
import { createAuthState, finishGoogleSignIn, getGoogleSignInUrl } from '../services/auth.service.js';
import { googleCallback } from './gmail.controller.js';

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

function saveSession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.save((error) => error ? reject(error) : resolve());
  });
}

export async function startGoogleSignIn(request: Request, response: Response): Promise<void> {
  const state = createAuthState();
  request.session.authState = state;
  await saveSession(request);
  response.redirect(getGoogleSignInUrl(state));
}

export async function completeGoogleSignIn(request: Request, response: Response): Promise<void> {
  const code = typeof request.query.code === 'string' ? request.query.code : null;
  const state = typeof request.query.state === 'string' ? request.query.state : null;
  if (!code || !state || state !== request.session.authState) {
    throw new AppError('Google sign-in could not be verified. Please try again.', 400);
  }

  request.session.user = await finishGoogleSignIn(code);
  delete request.session.authState;
  await saveSession(request);
  response.redirect(`${frontendUrl}${request.session.onboardingCompleted ? '/' : '/welcome'}`);
}

export async function completeGoogleCallback(request: Request, response: Response): Promise<void> {
  const state = typeof request.query.state === 'string' ? request.query.state : null;
  if (state && state === request.session.gmailAuthState) {
    await googleCallback(request, response);
    return;
  }
  await completeGoogleSignIn(request, response);
}

export function authStatus(request: Request, response: Response): void {
  response.json({ authenticated: Boolean(request.session.user), user: request.session.user ?? null, onboardingCompleted: Boolean(request.session.onboardingCompleted) });
}

export async function completeOnboarding(request: Request, response: Response): Promise<void> {
  if (!request.session.user) throw new AppError('Please sign in to continue.', 401);
  request.session.onboardingCompleted = true;
  await saveSession(request);
  response.status(204).end();
}

export async function logout(request: Request, response: Response): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    request.session.destroy((error) => error ? reject(error) : resolve());
  });
  response.clearCookie('connect.sid');
  response.status(204).end();
}
