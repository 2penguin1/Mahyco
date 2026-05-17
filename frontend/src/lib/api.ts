import { apiFetch, API_URL } from './api/config';

export async function uploadImage(file: File, saveDir?: string) {
  const form = new FormData();
  form.append("file", file);
  if (saveDir && saveDir.trim()) {
    form.append("save_dir", saveDir.trim());
  }
  
  const res = await apiFetch(`${API_URL}/analysis/upload`, {
    method: "POST",
    body: form,
  });
  
  if (!res.ok) {
    let err: any = {};
    try {
      err = await res.json();
    } catch {
      // ignore
    }
    throw new Error(err?.detail || "Upload failed");
  }
  return res.json();
}

export async function getAnalysis(analysisId: string | number) {
  const res = await apiFetch(`${API_URL}/analysis/${analysisId}`);
  if (!res.ok) throw new Error("Analysis not found");
  return res.json();
}

export async function getAnalysisOrthomosaic(analysisId: string | number): Promise<{
  url: string;
  scaleX: number;
  scaleY: number;
  origW: number;
  origH: number;
}> {
  const res = await apiFetch(`${API_URL}/analysis/${analysisId}/orthomosaic`);
  if (!res.ok) throw new Error("Orthomosaic not found");
  // These headers are exposed via the backend CORS expose_headers config
  const scaleX = parseFloat(res.headers.get("X-Scale-X") || "1");
  const scaleY = parseFloat(res.headers.get("Y-Scale-Y") || res.headers.get("X-Scale-Y") || "1");
  const origW  = parseInt(res.headers.get("X-Original-Width")  || "0", 10);
  const origH  = parseInt(res.headers.get("X-Original-Height") || "0", 10);
  const blob   = await res.blob();
  return { url: URL.createObjectURL(blob), scaleX, scaleY, origW, origH };
}

export async function getAnalysisVisual(analysisId: string | number): Promise<{
  url: string;
  scaleX: number;
  scaleY: number;
}> {
  const res = await apiFetch(`${API_URL}/analysis/${analysisId}/visual`);
  if (!res.ok) throw new Error("Classified visual not found");
  const blob = await res.blob();
  const scaleX = parseFloat(res.headers.get("X-Scale-X") || "1");
  const scaleY = parseFloat(res.headers.get("X-Scale-Y") || "1");
  return { url: URL.createObjectURL(blob), scaleX, scaleY };
}

export async function getHistory(skip = 0, limit = 50) {
  const res = await apiFetch(`${API_URL}/analysis/history/list?skip=${skip}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to load history");
  return res.json();
}

export async function downloadReport(analysisId: string | number) {
  const res = await apiFetch(`${API_URL}/analysis/${analysisId}/download/report`);
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

// ── Batch Processing ────────────────────────────────────────────────────────

export async function submitBatchJob(inputDir: string, outputDir?: string) {
  const form = new FormData();
  form.append("input_folder", inputDir);
  if (outputDir?.trim()) {
    form.append("save_dir", outputDir.trim());
    form.append("output_dir", outputDir.trim());
  }
  const res = await apiFetch(`${API_URL}/batch/submit`, { method: "POST", body: form });
  if (!res.ok) {
    let err: any = {};
    try { err = await res.json(); } catch {}
    throw new Error(err?.detail || "Batch submit failed");
  }
  return res.json();
}

export async function getBatchJobs(skip = 0, limit = 50) {
  const res = await apiFetch(`${API_URL}/batch/?skip=${skip}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to load batch jobs");
  return res.json();
}

export async function getBatchJob(jobId: string) {
  const res = await apiFetch(`${API_URL}/batch/${jobId}`);
  if (!res.ok) throw new Error("Batch job not found");
  return res.json();
}

export async function deleteBatchJob(jobId: string) {
  const res = await apiFetch(`${API_URL}/batch/${jobId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete batch job");
  return res.json();
}

export async function downloadBatchReport(jobId: string) {
  const res = await apiFetch(`${API_URL}/batch/${jobId}/download`);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const u = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = u;
  link.download = `mahyco_batch_${jobId.slice(0, 8)}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(u);
}
