import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Frontend-only admin role placeholder. There is no real auth here — the
// role is stored in localStorage so the UI can gate admin routes for the
// current browser session. Backend integration will replace this entirely.
// ---------------------------------------------------------------------------

export type AdminRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "content_manager"
  | "support_manager"
  | "finance_manager";

export const ADMIN_ROLES: AdminRole[] = [
  "super_admin",
  "admin",
  "manager",
  "content_manager",
  "support_manager",
  "finance_manager",
];

const STORAGE_KEY = "pj_admin_role";

type Ctx = {
  role: AdminRole | null;
  isAdmin: boolean;
  setRole: (r: AdminRole | null) => void;
};

const AdminRoleCtx = createContext<Ctx | null>(null);

export function AdminRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<AdminRole | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as AdminRole | null;
      if (stored && ADMIN_ROLES.includes(stored)) setRoleState(stored);
    } catch {}
  }, []);

  const setRole = useCallback((r: AdminRole | null) => {
    setRoleState(r);
    try {
      if (r) localStorage.setItem(STORAGE_KEY, r);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const value = useMemo(() => ({ role, isAdmin: role !== null, setRole }), [role, setRole]);
  return <AdminRoleCtx.Provider value={value}>{children}</AdminRoleCtx.Provider>;
}

export function useAdminRole() {
  const ctx = useContext(AdminRoleCtx);
  if (!ctx) throw new Error("useAdminRole must be used inside <AdminRoleProvider>");
  return ctx;
}
