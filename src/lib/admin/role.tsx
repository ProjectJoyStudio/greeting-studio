import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";

export type AdminRole =
  | "customer"
  | "editor"
  | "super_admin"
  | "admin"
  | "manager"
  | "content_manager"
  | "support_manager"
  | "finance_manager";

export const ADMIN_ROLES: AdminRole[] = [
  "customer",
  "editor",
  "super_admin",
  "admin",
  "manager",
  "content_manager",
  "support_manager",
  "finance_manager",
];

const ACCESS_ROLES = new Set<AdminRole>(["editor", "admin", "super_admin"]);
const ROLE_PRIORITY: AdminRole[] = [
  "super_admin",
  "admin",
  "editor",
  "manager",
  "content_manager",
  "support_manager",
  "finance_manager",
  "customer",
];

type Ctx = {
  role: AdminRole | null;
  email: string | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AdminRoleCtx = createContext<Ctx | null>(null);

export function AdminRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<AdminRole | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRole = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = session?.user;
      setEmail(user?.email ?? null);

      if (!user) {
        setRoleState(null);
        return;
      }

      const { data, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roleError) throw roleError;

      const roles = (data ?? [])
        .map((row) => row.role as AdminRole)
        .filter((value): value is AdminRole => ADMIN_ROLES.includes(value));
      const bestRole = ROLE_PRIORITY.find((candidate) => roles.includes(candidate)) ?? null;
      setRoleState(bestRole);
    } catch (err) {
      setRoleState(null);
      setError(err instanceof Error ? err.message : "Unable to load account permissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRole();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refreshRole();
    });
    return () => data.subscription.unsubscribe();
  }, [refreshRole]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRoleState(null);
    setEmail(null);
  }, []);

  const value = useMemo(
    () => ({
      role,
      email,
      loading,
      error,
      isAdmin: role !== null && ACCESS_ROLES.has(role),
      refreshRole,
      signOut,
    }),
    [email, error, loading, refreshRole, role, signOut],
  );
  return <AdminRoleCtx.Provider value={value}>{children}</AdminRoleCtx.Provider>;
}

export function useAdminRole() {
  const ctx = useContext(AdminRoleCtx);
  if (!ctx) throw new Error("useAdminRole must be used inside <AdminRoleProvider>");
  return ctx;
}
