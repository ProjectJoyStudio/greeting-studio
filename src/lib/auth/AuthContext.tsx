import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { User } from "@/types/models";

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
  const [status, setStatus] = useState<AuthStatus>("unauthenticated");

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated" && user !== null,
      signIn: async () => {
        // Placeholder — wire to Lovable Cloud / Supabase auth here.
        setStatus("unauthenticated");
      },
      signUp: async () => {
        setStatus("unauthenticated");
      },
      signOut: async () => {
        setUser(null);
        setStatus("unauthenticated");
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