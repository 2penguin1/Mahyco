import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <nav className="app-nav">
        <Link to="/dashboard" className="app-nav-brand">
          Mahyco
        </Link>
        <div className="app-nav-user">
          {user ? (
            <>
              <span>{user.full_name}</span>
              <span className={`role-badge ${user.role === "company" ? "company" : ""}`}>
                {user.role === "company" ? "Company" : "User"}
              </span>
              {user.company_name && <span className="muted">({user.company_name})</span>}
              <button type="button" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
