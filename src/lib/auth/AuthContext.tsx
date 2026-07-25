import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { User } from "@/types/models";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Frontend-only authentication context.
//
// This is architecture, not a real auth backend. All calls resolve locally
// and never talk to a server. When Lovable Cloud (or another auth provider)
// is wired in, only the implementations inside AuthProvider change — every
// consumer (route guards, header, dashboard pages) keeps using this hook.
// ---------------------------------------------------------------------------

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user;
      if (u) {
        setUser({ id: u.id, email: u.email ?? "", displayName: (u.user_metadata?.display_name as string) ?? u.email ?? "" } as User);
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user;
      if (u) {
        setUser({ id: u.id, email: u.email ?? "", displayName: (u.user_metadata?.display_name as string) ?? u.email ?? "" } as User);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated" && user !== null,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      requestPasswordReset: async () => {
        // Placeholder — will call Supabase resetPasswordForEmail here.
      },
      updatePassword: async () => {
        // Placeholder — will call Supabase updateUser({ password }) here.
      },
      resendVerification: async () => {
        // Placeholder — will resend the verification email.
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}