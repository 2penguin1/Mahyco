/**
 * Base URL for API. No trailing slash.
 * Use 127.0.0.1 to match uvicorn (avoids "fail to fetch" on some setups).
 */
const getApiBase = () => {
  const url = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
  return url.replace(/\/$/, "");
};

/**
 * User-friendly message when fetch fails (e.g. backend not running).
 */
export function normalizeFetchError(err) {
  const msg = err?.message || String(err);
  if (
    msg === "Failed to fetch" ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed")
  ) {
    return "Cannot connect to server. Make sure the backend is running (e.g. uvicorn on port 8000).";
  }
  return msg;
}

export async function authLogin(email, password) {
  const base = getApiBase();
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const detail = payload.detail || (typeof payload.detail === "string" ? payload.detail : "Login failed");
    throw new Error(Array.isArray(detail) ? detail[0]?.msg || "Login failed" : detail);
  }
  return res.json();
}

export async function authRegister(fullName, email, password) {
  const base = getApiBase();
  const res = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: fullName,
      email,
      password,
      role: "user",
      company_name: null,
    }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const detail = payload.detail || "Registration failed";
    throw new Error(Array.isArray(detail) ? detail[0]?.msg || "Registration failed" : detail);
  }
  return res.json();
}
