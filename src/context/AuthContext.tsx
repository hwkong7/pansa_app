import type { Session, User } from '@supabase/supabase-js';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { shouldForgetLogin } from '@/lib/rememberLogin';

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
    // "로그인 저장"을 체크 안 하고 로그인했으면, 앱을 새로 켤 때(=이 effect가 처음
    // 도는 시점)마다 세션을 강제로 지워서 온보딩부터 다시 보여준다.
    (async () => {
      if (await shouldForgetLogin()) {
        await supabase.auth.signOut();
        setSession(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, loading }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}