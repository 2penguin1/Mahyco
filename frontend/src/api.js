const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function getToken() {
  return localStorage.getItem("mahyco_token");
}

function getHeaders(includeAuth = true) {
  const headers = { "Content-Type": "application/json" };
  if (includeAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function register({ email, password, full_name, role, company_name }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: getHeaders(false),
    body: JSON.stringify({
      email,
      password,
      full_name,
      role: role || "user",
      company_name: role === "company" ? company_name : undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

export async function login(email, password) {
  const form = new FormData();
  form.append("username", email);
  form.append("password", password);
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

export async function me() {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export async function uploadImage(file) {
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/analysis/upload`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function getAnalysis(analysisId) {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Analysis not found");
  return res.json();
}

export async function getHistory(skip = 0, limit = 50) {
  const res = await fetch(
    `${API_BASE}/analysis/history/list?skip=${skip}&limit=${limit}`,
    { headers: getHeaders() }
  );
  if (!res.ok) throw new Error("Failed to load history");
  return res.json();
}

export async function downloadReport(analysisId) {
  const token = getToken();
  const url = `${API_BASE}/analysis/${analysisId}/download/report`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const u = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = u;
  link.download = `mahyco_report_${analysisId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(u);
}
