import { Outlet, Link } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";

export default function Layout() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="app-layout">
      <nav className="app-nav">
        <Link to="/dashboard" className="app-nav-brand">
          Mahyco
        </Link>
        <div className="app-nav-user">
          {user ? (
            <>
              <span>{user.fullName}</span>
              <button type="button" onClick={() => signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/sign-in">Login</Link>
              <Link to="/sign-up">Register</Link>
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
