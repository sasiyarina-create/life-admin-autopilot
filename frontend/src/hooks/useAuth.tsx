import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthStatus, logout as endSession, type AuthUser } from '../services/auth-service';

type AuthContextValue = {
  isLoading: boolean;
  user: AuthUser | null;
  onboardingCompleted: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  const refresh = async () => {
    try {
      const status = await getAuthStatus();
      setUser(status.user);
      setOnboardingCompleted(status.onboardingCompleted);
    } catch {
      setUser(null);
      setOnboardingCompleted(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const value = useMemo(() => ({
    isLoading, user, onboardingCompleted,
    refresh,
    logout: async () => {
      await endSession();
      setUser(null);
      setOnboardingCompleted(false);
    },
  }), [isLoading, onboardingCompleted, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
