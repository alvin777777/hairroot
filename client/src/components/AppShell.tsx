import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ROLE_LABEL, useAuth } from "../context/AuthContext.js";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  const link = ({ isActive }: { isActive: boolean }) => `nav-link px-2 ${isActive ? "active fw-semibold" : ""}`;

  return (
    <>
      <nav className="navbar bg-body-tertiary border-bottom">
        <div className="container d-flex flex-wrap gap-2">
          <span className="navbar-brand mb-0">HairRoot</span>
          <div className="nav me-auto">
            {user?.role === "CUSTOMER" && (
              <>
                <NavLink to="/slots" className={link}>Available times</NavLink>
                <NavLink to="/bookings" className={link}>My bookings</NavLink>
              </>
            )}
            {user?.role === "STAFF" && <NavLink to="/schedule" className={link}>My schedule</NavLink>}
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-body-secondary" data-testid="current-user">
              {user?.name} ({user && ROLE_LABEL[user.role]})
            </span>
            <button className="btn btn-outline-secondary btn-sm" onClick={onLogout}>Log out</button>
          </div>
        </div>
      </nav>
      <main className="container py-4">{children}</main>
    </>
  );
}
