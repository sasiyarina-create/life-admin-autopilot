import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { authStatus, completeGoogleCallback, completeOnboarding, logout, startGoogleSignIn } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.get('/login/google', asyncHandler(startGoogleSignIn));
authRouter.get('/google/callback', asyncHandler(completeGoogleCallback));
authRouter.get('/status', authStatus);
authRouter.post('/onboarding/complete', asyncHandler(completeOnboarding));
authRouter.post('/logout', asyncHandler(logout));
