import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { googleCallback, googleLogin, gmailDisconnect, gmailStatus, gmailSync } from '../controllers/gmail.controller.js';

export const gmailRouter = Router();
gmailRouter.get('/auth/google', asyncHandler(googleLogin));
gmailRouter.get('/auth/google/callback', asyncHandler(googleCallback));
gmailRouter.get('/gmail/status', asyncHandler(gmailStatus));
gmailRouter.post('/gmail/sync', asyncHandler(gmailSync));
gmailRouter.post('/gmail/disconnect', asyncHandler(gmailDisconnect));
