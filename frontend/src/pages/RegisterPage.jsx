import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "../auth/AuthContext";
import { authRegister, normalizeFetchError } from "../auth/authApi";
import "./Auth.css";

const IconPerson = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconMail = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const IconLock = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default function RegisterPage() {
  const { saveAuth } = useAuthContext();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authRegister(fullName, email, password);
      saveAuth(data.access_token, data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(normalizeFetchError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        <div className="auth-panel-left">
          <div className="auth-brand">
            <div className="auth-brand-icon">🌾</div>
            <span className="auth-brand-text">Mahyco</span>
          </div>
          <h1 className="auth-welcome-title">Welcome Back!</h1>
          <p className="auth-welcome-sub">
            To keep connected with us please login with your personal info.
          </p>
          <Link to="/login" className="auth-signin-btn" style={{ textDecoration: "none", textAlign: "center", lineHeight: "1.25" }}>
            SIGN IN
          </Link>
        </div>
        <div className="auth-panel-right">
          <h2 className="auth-form-title">Create Account</h2>
          <p className="auth-or">Use your email for registration:</p>
          <form onSubmit={onSubmit} className="auth-form">
            <label>
              <span className="auth-label">Name</span>
              <div className="auth-input-wrap">
                <IconPerson />
                <input
                  type="text"
                  placeholder="Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </label>
            <label>
              <span className="auth-label">Email</span>
              <div className="auth-input-wrap">
                <IconMail />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </label>
            <label>
              <span className="auth-label">Password</span>
              <div className="auth-input-wrap">
                <IconLock />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Creating…" : "SIGN UP"}
            </button>
          </form>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
