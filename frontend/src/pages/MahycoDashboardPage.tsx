import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import * as api from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { AnalyticsView } from "@/components/ui/AnalyticsView";
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Download, Clock, FolderOpen, X } from "lucide-react";
import toast from "react-hot-toast";
import { usePipelineSettings } from "@/lib/context/PipelineSettingsContext";

const TABS = [
  { id: "upload", label: "Upload & Analyze" },
  { id: "report", label: "Analysis Report" },
  { id: "analytics", label: "Analytics" },
];

function classLabel(c: string) {
  if (c === "healthy") return "Healthy";
  if (c === "mild_infection") return "Mild infection";
  return "Severe infection";
}

function classColor(c: string) {
  if (c === "healthy") return "success";
  if (c === "mild_infection") return "warning";
  return "danger";
}

export default function DashboardPage() {
  const { settings } = usePipelineSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ type: string; message: string } | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [reportTab, setReportTab] = useState("summary");
  const [savedPath, setSavedPath] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  // Ref to the hidden file input so we can trigger it from any button
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save location
  const [saveDir, setSaveDir] = useState(settings.defaultAnalysisSaveDir);
  useEffect(() => {
    setSaveDir(settings.defaultAnalysisSaveDir);
  }, [settings.defaultAnalysisSaveDir]);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    const initId = searchParams.get("analysisId");
    if (initId) {
      loadAnalysis(initId);
    }
  }, [searchParams]);

  const loadAnalysis = async (id: string) => {
    try {
      const data = await api.getAnalysis(id);
      setAnalysis(data);
      setTab("report");
      setReportTab("summary");
      if (data.stored_path) setSavedPath(data.stored_path);
      
      // Clear param so it doesn't get re-loaded repeatedly
      searchParams.delete("analysisId");
      setSearchParams(searchParams);
    } catch {
      toast.error("Could not load analysis");
      searchParams.delete("analysisId");
      setSearchParams(searchParams);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && f.type.startsWith("image/")) setFile(f);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target?.files?.[0];
    if (f && f.type.startsWith("image/")) {
      setPendingFile(f);
      setShowSaveModal(true); // show save location modal
    }
    // reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Called when user confirms save location
  const handleConfirmSave = () => {
    if (pendingFile) {
      setFile(pendingFile);
      setPendingFile(null);
    }
    setShowSaveModal(false);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    const filename = file.name;
    setUploadStatus({ type: "loading", message: "Uploading and analyzing…" });
    setSavedPath("");
    setAnalysis(null);
    const toastId = toast.loading(`Analysing ${filename}…`);
    try {
      const result = await api.uploadImage(file, saveDir);
      setUploadStatus({ type: "success", message: "Upload complete." });
      if (result.stored_path) setSavedPath(result.stored_path);
      setAnalysis(result);
      setTab("report");
      setReportTab("summary");
      toast.success("Analysis completed", { id: toastId });
    } catch (err: any) {
      setUploadStatus({ type: "error", message: err.message || "Upload failed" });
      toast.error("Analysis failed", { id: toastId });
    }
  };

  const downloadReportData = async (id: string | number) => {
    try {
      await api.downloadReport(id);
      toast.success("Report downloaded successfully");
    } catch (err) {
      toast.error("Failed to download report");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          tab === "upload" ? "Upload & Analyze"
          : tab === "report" ? "Analysis Report"
          : "Analytics"
        }
      />

      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

      {tab === "upload" && (
        <Card className="p-8">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragOver ? "border-accent bg-accent/5" : "border-[var(--border-default)]"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-[var(--surface-raised)] rounded-full">
                <UploadCloud size={48} className="text-accent" />
              </div>
              <h3 className="text-xl font-medium text-[var(--text-primary)]">Drop image here</h3>
              <p className="text-[var(--text-muted)]">
                Or browse files from your computer
              </p>

              {/* Hidden file input — triggered by the button below via ref */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInput}
              />

              <Button
                variant="secondary"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Select File
              </Button>
            </div>

            {file && (
              <div className="mt-8 p-4 bg-[var(--surface-raised)] rounded-lg flex items-center justify-between max-w-md mx-auto border border-[var(--border-subtle)]">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="text-[var(--text-muted)] flex-shrink-0" />
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {file.name}
                  </span>
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={uploadStatus?.type === "loading"}
                >
                  {uploadStatus?.type === "loading" ? "Analyzing..." : "Analyze Image"}
                </Button>
              </div>
            )}
          </div>

          {uploadStatus && uploadStatus.type !== "loading" && (
            <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
              uploadStatus.type === "success" 
                ? "bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20" 
                : "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20"
            }`}>
              {uploadStatus.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <div>
                <p className="font-medium">{uploadStatus.message}</p>
                {savedPath && (
                  <p className="text-sm mt-1 opacity-90 break-all">
                    Saved path: {savedPath}
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === "report" && (
        <div className="space-y-6">
          {analysis ? (
            <>
              <Card className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      {analysis.original_filename}
                    </h3>
                    {analysis.stored_path && (
                      <p className="text-sm text-[var(--text-muted)] mt-1 break-all">
                        {analysis.stored_path}
                      </p>
                    )}
                  </div>
                  <Button variant="secondary" onClick={() => downloadReportData(analysis.analysis_id)}>
                    <Download size={16} className="mr-2" />
                    Download JSON
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                  <div className="col-span-2 bg-[var(--surface-raised)] p-6 rounded-xl flex flex-col items-center justify-center border border-[var(--border-subtle)]">
                    <div className="text-4xl font-bold text-accent mb-2">
                      {analysis.overall_health_score ?? 0}%
                    </div>
                    <div className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium">
                      Health Score
                    </div>
                  </div>
                  
                  <div className="bg-[var(--surface-raised)] p-4 rounded-xl flex flex-col justify-center border border-[var(--border-subtle)]">
                    <div className="text-2xl font-semibold text-[var(--color-success)] mb-1">{analysis.chunks_healthy ?? 0}</div>
                    <div className="text-xs text-[var(--text-muted)] uppercase">Healthy Chunks</div>
                  </div>
                  <div className="bg-[var(--surface-raised)] p-4 rounded-xl flex flex-col justify-center border border-[var(--border-subtle)]">
                    <div className="text-2xl font-semibold text-[var(--color-warning)] mb-1">{analysis.chunks_mild ?? 0}</div>
                    <div className="text-xs text-[var(--text-muted)] uppercase">Mild Chunks</div>
                  </div>
                  <div className="bg-[var(--surface-raised)] p-4 rounded-xl flex flex-col justify-center border border-[var(--border-subtle)]">
                    <div className="text-2xl font-semibold text-[var(--color-danger)] mb-1">{analysis.chunks_severe ?? 0}</div>
                    <div className="text-xs text-[var(--text-muted)] uppercase">Severe Chunks</div>
                  </div>
                  <div className="bg-[var(--surface-raised)] p-4 rounded-xl flex flex-col justify-center border border-[var(--border-subtle)]">
                    <div className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{analysis.chunks_total ?? 0}</div>
                    <div className="text-xs text-[var(--text-muted)] uppercase">Total Chunks</div>
                  </div>
                </div>

                <Tabs 
                  tabs={[
                    { id: "summary", label: "Summary" },
                    { id: "chunks", label: "Chunk Details" }
                  ]} 
                  activeTab={reportTab} 
                  onChange={setReportTab} 
                />

                {reportTab === "summary" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="p-4 bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)]">
                      <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2 uppercase">Dominant Class</h4>
                      <Badge variant={classColor(analysis.dominant_class) as any}>
                        {classLabel(analysis.dominant_class)}
                      </Badge>
                    </div>
                    <div className="p-4 bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)]">
                      <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2 uppercase">Processing Time</h4>
                      <div className="flex items-center text-lg font-medium text-[var(--text-primary)]">
                        <Clock size={18} className="mr-2 text-[var(--text-muted)]" />
                        {analysis.processing_time_seconds ?? 0}s
                      </div>
                    </div>
                  </div>
                )}

                {reportTab === "chunks" && analysis.chunk_results?.length > 0 && (
                  <div className="mt-6">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {analysis.chunk_results.slice(0, 48).map((c: any) => (
                        <div key={c.chunk_id} className="p-3 bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)] flex flex-col items-center text-center">
                          <Badge variant={classColor(c.predicted_class) as any} className="mb-2 w-full justify-center">
                            {classLabel(c.predicted_class).split(' ')[0]}
                          </Badge>
                          <div className="text-xs text-[var(--text-muted)]">
                            Conf: {(c.confidence * 100).toFixed(0)}%
                          </div>
                          {c.severity_score != null && (
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                              Sev: {(c.severity_score * 100).toFixed(0)}%
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {analysis.chunk_results.length > 48 && (
                      <p className="text-sm text-[var(--text-muted)] mt-4 text-center">
                        + {analysis.chunk_results.length - 48} more chunks
                      </p>
                    )}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-[var(--surface-raised)] rounded-full flex items-center justify-center mb-4">
                <FileText size={32} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--text-primary)]">No report yet</h3>
              <p className="text-[var(--text-muted)] mt-2 max-w-sm">
                Upload and analyze an image, or open one from the History tab.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ── Analytics Tab ──────────────────────────────────── */}
      {tab === "analytics" && (
        <Card className="p-6">
          {analysis ? (
            <AnalyticsView analysis={analysis} />
          ) : (
            <div className="py-16 text-center flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
                <FileText size={28} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-[var(--text-muted)]">Run an analysis first to see charts here.</p>
              <Button variant="secondary" onClick={() => setTab("upload")}>Go to Upload</Button>
            </div>
          )}
        </Card>
      )}


      {/* ── Save Location Modal ────────────────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderOpen size={20} className="text-accent" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Choose Save Location</h2>
              </div>
              <button
                onClick={() => { setShowSaveModal(false); setPendingFile(null); }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {pendingFile && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)]">
                <FileText size={16} className="text-[var(--text-muted)] shrink-0" />
                <span className="text-sm text-[var(--text-primary)] truncate">{pendingFile.name}</span>
                <span className="text-xs text-[var(--text-muted)] shrink-0 ml-auto">{(pendingFile.size / 1024).toFixed(0)} KB</span>
              </div>
            )}

            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
              Save directory path
            </label>
            <input
              type="text"
              value={saveDir}
              onChange={e => setSaveDir(e.target.value)}
              placeholder="./uploads or C:/your/custom/path"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1.5">
              Relative paths are resolved from the backend working directory.
            </p>

            <div className="flex gap-3 mt-5">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setShowSaveModal(false); setPendingFile(null); }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleConfirmSave}>
                Confirm & Use This File
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
