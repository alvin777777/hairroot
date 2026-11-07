import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { Role, UNAUTHENTICATED_EVENT, User, getMe, login as apiLogin, logout as apiLogout } from "../api.js";

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

// The httpOnly cookie is the only credential. This state just caches the server's answer.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    const onLost = () => setUser(null);
    window.addEventListener(UNAUTHENTICATED_EVENT, onLost);
    return () => window.removeEventListener(UNAUTHENTICATED_EVENT, onLost);
  }, []);

  async function login(email: string, password: string) {
    const { user: next } = await apiLogin(email, password);
    setUser(next);
    return next;
  }

  async function logout() {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export const roleHome = (role: Role) => (role === "STAFF" ? "/schedule" : "/slots");
export const ROLE_LABEL: Record<Role, string> = { CUSTOMER: "Student", STAFF: "Advisor" };
