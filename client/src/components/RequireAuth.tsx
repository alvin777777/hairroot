import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Role } from "../api.js";
import { roleHome, useAuth } from "../context/AuthContext.js";
import AppShell from "./AppShell.js";

// Navigation convenience only. The API enforces the real permissions.
export default function RequireAuth({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-4 text-body-secondary" role="status">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return <AppShell>{children}</AppShell>;
}
