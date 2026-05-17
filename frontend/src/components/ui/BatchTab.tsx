import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Upload, Loader2, Trash2, Download,
  ChevronDown, ChevronRight, FolderOpen, CheckCircle2, AlertCircle, Clock
} from "lucide-react";
import toast from "react-hot-toast";
import * as api from "@/lib/api";
import { usePipelineSettings } from "@/lib/context/PipelineSettingsContext";

// ── Types ───────────────────────────────────────────────────────────────────
interface BatchJobResult {
  filename: string;
  stored_path?: string;
  status: "completed" | "failed";
  error?: string;
  overall_health_score?: number;
  dominant_class?: string;
  chunks_total?: number;
  chunks_healthy?: number;
  chunks_mild?: number;
  chunks_severe?: number;
  processing_time_seconds?: number;
}

interface BatchJob {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  total_images: number;
  processed_images: number;
  failed_images: number;
  save_dir?: string;
  error_message?: string;
  results: BatchJobResult[];
  created_at: string;
  completed_at?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return "—"; }
}

function StatusBadge({ status }: { status: BatchJob["status"] }) {
  const cfg: Record<string, { label: string; variant: any }> = {
    PENDING:    { label: "Pending",    variant: "warning" },
    PROCESSING: { label: "Processing", variant: "info" },
    COMPLETED:  { label: "Completed",  variant: "success" },
    FAILED:     { label: "Failed",     variant: "danger" },
  };
  const c = cfg[status] ?? { label: status, variant: "default" };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[var(--border-default)] rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0">
        {value}/{total}
      </span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function BatchTab() {
  const { settings } = usePipelineSettings();
  const [inputDir, setInputDir] = useState("");
  const [saveDir, setSaveDir] = useState(settings.defaultBatchOutputDir);

  useEffect(() => {
    setSaveDir(settings.defaultBatchOutputDir);
  }, [settings.defaultBatchOutputDir]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Load jobs ──────────────────────────────────────────────────────────────
  const loadJobs = useCallback(async (background = false) => {
    if (!background) setLoadingJobs(true);
    try {
      const data = await api.getBatchJobs(0, 100);
      setJobs(data.jobs || []);
    } catch {
      if (!background) setJobs([]);
    } finally {
      if (!background) setLoadingJobs(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // ── Poll while any job is active ────────────────────────────────────────────
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === "PENDING" || j.status === "PROCESSING");
    if (!hasActive) return;
    const id = setInterval(() => loadJobs(true), 2000);
    return () => clearInterval(id);
  }, [jobs, loadJobs]);



  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!inputDir || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const tid = toast.loading(`Submitting batch job…`);
    try {
      await api.submitBatchJob(inputDir, saveDir);
      setInputDir("");
      toast.success("Batch job submitted", { id: tid });
      await loadJobs();
    } catch (err: any) {
      setSubmitError(err.message || "Submit failed");
      toast.error("Submit failed", { id: tid });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (jobId: string) => {
    if (!confirm("Delete this batch job?")) return;
    setDeletingId(jobId);
    try {
      await api.deleteBatchJob(jobId);
      toast.success("Job deleted");
      await loadJobs();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = async (jobId: string) => {
    try {
      await api.downloadBatchReport(jobId);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedJobs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Upload Zone ─────────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <div className="border-[var(--border-default)] bg-[var(--surface)] rounded-xl border-2">
          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg shrink-0">
                <FolderOpen size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Submit Batch Job
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Provide a local folder path containing orthomosaic images.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Input Directory Path
                </label>
                <input
                  type="text"
                  value={inputDir}
                  onChange={e => setInputDir(e.target.value)}
                  placeholder="C:/path/to/input/images"
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg bg-[var(--surface-raised)] text-sm text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Output Directory Path (Optional)
                </label>
                <input
                  type="text"
                  value={saveDir}
                  onChange={e => setSaveDir(e.target.value)}
                  placeholder="./uploads"
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg bg-[var(--surface-raised)] text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <Button
                onClick={handleSubmit}
                disabled={!inputDir || submitting}
              >
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" /> Submitting…</>
                ) : (
                  <><Upload size={14} /> Submit Batch</>
                )}
              </Button>
            </div>
          </div>

          {submitError && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] text-xs">
                <AlertCircle size={14} />
                {submitError}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Jobs Table ──────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Batch Jobs
            {jobs.length > 0 && (
              <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">({jobs.length})</span>
            )}
          </h3>
          <Button variant="secondary" className="h-7 px-3 text-xs" onClick={() => loadJobs()}>
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                {["", "ID", "Images", "Progress", "Status", "Save Dir", "Created", "Completed", "Actions"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingJobs ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <Loader2 size={22} className="animate-spin text-[var(--text-muted)] mx-auto" />
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                      <Clock size={28} className="opacity-50" />
                      <p className="text-sm">No batch jobs yet. Upload images above to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                jobs.map(job => {
                  const expanded = expandedJobs.has(job.id);
                  const hasResults = job.results?.length > 0;
                  return (
                    <>
                      <tr
                        key={job.id}
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer group"
                        onClick={() => hasResults && toggleExpand(job.id)}
                      >
                        {/* Expand chevron */}
                        <td className="px-3 py-3 w-8">
                          {hasResults ? (
                            expanded
                              ? <ChevronDown size={14} className="text-[var(--text-muted)]" />
                              : <ChevronRight size={14} className="text-[var(--text-muted)]" />
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                          {job.id.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3 text-[var(--text-primary)]">
                          {job.total_images}
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          {job.status === "PENDING" || job.status === "PROCESSING" ? (
                            <ProgressBar value={job.processed_images} total={job.total_images} />
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">
                              {job.processed_images}/{job.total_images}
                              {job.failed_images > 0 && (
                                <span className="text-[var(--color-danger)] ml-1">
                                  ({job.failed_images} failed)
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)] max-w-[160px] truncate">
                          {job.save_dir || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)] tabular-nums">
                          {formatTime(job.created_at)}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)] tabular-nums">
                          {job.completed_at ? formatTime(job.completed_at) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {job.status === "COMPLETED" && (
                              <button
                                onClick={() => handleDownload(job.id)}
                                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-accent hover:bg-accent/10 transition-colors"
                                title="Download ZIP"
                              >
                                <Download size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(job.id)}
                              disabled={deletingId === job.id}
                              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors disabled:opacity-40"
                              title="Delete job"
                            >
                              {deletingId === job.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Trash2 size={14} />
                              }
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded results ────────────────────────────── */}
                      {expanded && hasResults && (
                        <tr key={`${job.id}-expanded`} className="border-b border-[var(--border-subtle)]">
                          <td colSpan={9} className="bg-[var(--surface-raised)] px-4 pb-4 pt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                              {job.results.map((r, i) => (
                                <div
                                  key={i}
                                  className={`rounded-lg p-3 border text-xs ${
                                    r.status === "failed"
                                      ? "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5"
                                      : "border-[var(--border-subtle)] bg-[var(--surface)]"
                                  }`}
                                >
                                  <div className="flex items-start gap-2 mb-2">
                                    {r.status === "completed"
                                      ? <CheckCircle2 size={13} className="text-[var(--color-success)] mt-0.5 shrink-0" />
                                      : <AlertCircle size={13} className="text-[var(--color-danger)] mt-0.5 shrink-0" />
                                    }
                                    <span className="font-medium text-[var(--text-primary)] truncate">
                                      {r.filename}
                                    </span>
                                  </div>
                                  {r.status === "completed" ? (
                                    <div className="space-y-1 text-[var(--text-muted)]">
                                      <div className="flex justify-between">
                                        <span>Health Score</span>
                                        <span className="font-semibold text-[var(--color-success)]">
                                          {r.overall_health_score ?? 0}%
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Dominant</span>
                                        <span className="font-medium text-[var(--text-primary)]">
                                          {r.dominant_class === "healthy" ? "Healthy"
                                            : r.dominant_class === "mild_infection" ? "Mild"
                                            : "Severe"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Chunks</span>
                                        <span>{r.chunks_total ?? 0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Time</span>
                                        <span>{r.processing_time_seconds ?? 0}s</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-[var(--color-danger)] text-xs mt-1 break-all">
                                      {r.error || "Unknown error"}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
