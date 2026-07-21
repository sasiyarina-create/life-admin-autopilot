import { google } from 'googleapis';
import { randomBytes } from 'node:crypto';
import { AppError } from '../utils/app-error.js';

const identityScopes = ['openid', 'email', 'profile'];

function oauthClient() {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, GOOGLE_REDIRECT_URI: redirectUri } = process.env;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new AppError('Google sign-in is not configured.', 503);
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function createAuthState(): string {
  return randomBytes(24).toString('hex');
}

export function getGoogleSignInUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: 'online',
    scope: identityScopes,
    state,
  });
}

export async function finishGoogleSignIn(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const profile = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
  if (!profile.data.email) {
    throw new AppError('Unable to read the Google account details.', 502);
  }

  return {
    email: profile.data.email,
    name: profile.data.name?.trim() || profile.data.email.split('@')[0],
    picture: profile.data.picture ?? null,
  };
}
