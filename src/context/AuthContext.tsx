import type { Session, User } from '@supabase/supabase-js';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE, DEMO_USER, demoAuth } from '@/lib/demo';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoSignedIn, setDemoSignedIn] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) {
      // 데모: 로그인 화면을 그대로 보여주되, demoAuth 상태를 구독한다.
      setDemoSignedIn(demoAuth.isSignedIn());
      setLoading(false);
      const unsub = demoAuth.subscribe(() => setDemoSignedIn(demoAuth.isSignedIn()));
      return unsub;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    if (DEMO_MODE) {
      if (!demoSignedIn) return { session: null, user: null, loading: false };
      const demoSession = {
        user: {
          id: DEMO_USER.id,
          user_metadata: { nickname: DEMO_USER.nickname },
        },
      } as unknown as Session;
      return { session: demoSession, user: demoSession.user, loading: false };
    }
    return { session, user: session?.user ?? null, loading };
  }, [session, loading, demoSignedIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
