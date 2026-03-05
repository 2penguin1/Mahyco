const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function authFetch(path, options = {}, getToken) {
  const token = await getToken?.();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export async function uploadImage(file, getToken) {
  const form = new FormData();
  form.append("file", file);
  const res = await authFetch("/analysis/upload", { method: "POST", body: form }, getToken);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function getAnalysis(analysisId, getToken) {
  const res = await authFetch(`/analysis/${analysisId}`, {}, getToken);
  if (!res.ok) throw new Error("Analysis not found");
  return res.json();
}

export async function getHistory(skip = 0, limit = 50, getToken) {
  const res = await authFetch(`/analysis/history/list?skip=${skip}&limit=${limit}`, {}, getToken);
  if (!res.ok) throw new Error("Failed to load history");
  return res.json();
}

export async function downloadReport(analysisId, getToken) {
  const token = await getToken?.();
  const url = `${API_BASE}/analysis/${analysisId}/download/report`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
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
