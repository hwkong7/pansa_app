import type { Session, User } from '@supabase/supabase-js';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE, DEMO_USER } from '@/lib/demo';

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

  useEffect(() => {
    if (DEMO_MODE) {
      setLoading(false);
      return; // 데모 모드에서는 실제 세션 구독을 하지 않음
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
      // 로그인 없이 화면을 보기 위한 가짜 세션 (실제 로그인 아님)
      const demoSession = {
        user: {
          id: DEMO_USER.id,
          user_metadata: { nickname: DEMO_USER.nickname },
        },
      } as unknown as Session;
      return { session: demoSession, user: demoSession.user, loading: false };
    }
    return { session, user: session?.user ?? null, loading };
  }, [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
