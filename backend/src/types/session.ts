import 'express-session';

declare module 'express-session' {
  interface SessionData {
    authState?: string;
    gmailAuthState?: string;
    continueOnboarding?: boolean;
    onboardingCompleted?: boolean;
    user?: {
      email: string;
      name: string;
      picture: string | null;
    };
  }
}
