import { useState, useCallback } from "react";
import * as api from "../api";
import "./Dashboard.css";
import { useAuthContext } from "../auth/AuthContext";
import { useNotifications } from "../context/NotificationContext";

const TABS = ["upload", "report", "history"];

function classLabel(c) {
  if (c === "healthy") return "Healthy";
  if (c === "mild_infection") return "Mild infection";
  return "Severe infection";
}

export default function Dashboard() {
  const { getToken } = useAuthContext();
  const { addNotification } = useNotifications();
  const [tab, setTab] = useState("upload");
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [reportTab, setReportTab] = useState("summary");
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [savedPath, setSavedPath] = useState("");

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    const f = e.dataTransfer?.files?.[0];
    if (f && f.type.startsWith("image/")) setFile(f);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.add("dragover");
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
  }, []);

  const handleFileInput = (e) => {
    const f = e.target?.files?.[0];
    if (f && f.type.startsWith("image/")) setFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    const filename = file.name;
    setUploadStatus({ type: "loading", message: "Uploading and analyzing…" });
    setSavedPath("");
    setAnalysis(null);
    addNotification({
      message: "Still analysing…",
      type: "progress",
      filename,
    });
    try {
      const result = await api.uploadImage(file, getToken);
      setUploadStatus({ type: "success", message: "Upload complete." });
      if (result.stored_path) {
        setSavedPath(result.stored_path);
      }
      setAnalysis(result);
      setTab("report");
      setReportTab("summary");
      setHistoryLoaded(false);
      addNotification({
        message: "Analysis completed",
        type: "completed",
        filename,
      });
    } catch (err) {
      setUploadStatus({ type: "error", message: err.message || "Upload failed" });
      addNotification({
        message: "Analysis failed",
        type: "error",
        filename,
      });
    }
  };

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return;
    try {
      const list = await api.getHistory(0, 50, getToken);
      setHistory(list);
      setHistoryLoaded(true);
    } catch {
      setHistory([]);
      setHistoryLoaded(true);
    }
  }, [historyLoaded]);

  const openAnalysis = async (id) => {
    try {
      const data = await api.getAnalysis(id, getToken);
      setAnalysis(data);
      setTab("report");
      setReportTab("summary");
    } catch {
      setUploadStatus({ type: "error", message: "Could not load analysis" });
    }
  };

  if (tab === "history" && !historyLoaded) loadHistory();

  return (
    <div className="dashboard">
      <div className="dashboard-content">
      <header className="dashboard-header">
        <h1>{tab === "upload" ? "Upload & Analyze" : tab === "report" ? "Analysis Report" : "History"}</h1>
        <p>
          {tab === "upload"
            ? "Please upload an image below. We run chunking, segmentation, and disease classification (healthy, mild, severe)."
            : tab === "report"
            ? "View results and chunk-level details for your analyzed image."
            : "Your past analyses. Open any item to view the full report."}
        </p>
      </header>

      <div className="dashboard-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={t === tab ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t === "upload" && "Upload & analyze"}
            {t === "report" && "Analysis report"}
            {t === "history" && "History"}
          </button>
        ))}
      </div>

      <div className="dashboard-panel">
        {tab === "upload" && (
          <div className="upload-section">
            <div
              className={`upload-zone ${file ? "has-file" : ""} ${uploadStatus?.type === "loading" ? "is-loading" : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="upload-zone-cloud">☁</div>
              <h3>Drop Files Here</h3>
              <p className="upload-zone-browse">
                Or browse files from your computer{" "}
                <label htmlFor="file-input" className="upload-zone-link">here</label>
              </p>
              <input
                type="file"
                accept="image/*"
                id="file-input"
                onChange={handleFileInput}
              />
              {file && (
                <>
                  <p className="file-name">{file.name}</p>
                  <button
                    type="button"
                    className="btn-analyze"
                    onClick={handleAnalyze}
                    disabled={uploadStatus?.type === "loading"}
                  >
                    {uploadStatus?.type === "loading" ? "Analyzing…" : "Analyze image"}
                  </button>
                </>
              )}
            </div>
            {uploadStatus?.type === "loading" && (
              <div className="upload-progress">
                <span className="upload-progress-text">Uploading and analyzing…</span>
                <div className="upload-progress-bar">
                  <div className="upload-progress-fill" style={{ width: "70%" }} />
                </div>
              </div>
            )}
            {uploadStatus && uploadStatus.type !== "loading" && (
              <div className={`upload-status ${uploadStatus.type}`}>
                {uploadStatus.message}
                {savedPath && (
                  <div style={{ marginTop: "0.5rem", wordBreak: "break-all", fontSize: "0.85rem" }}>
                    <strong>Saved path:</strong> {savedPath}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "report" && (
          <div className="analysis-result">
            {analysis ? (
              <>
                <h3>Report: {analysis.original_filename}</h3>
                {analysis.stored_path && (
                  <p className="muted" style={{ marginBottom: "0.75rem", wordBreak: "break-all", fontSize: "0.85rem" }}>
                    <strong>Image path:</strong> {analysis.stored_path}
                  </p>
                )}
                <div className="health-score-visual" style={{ marginBottom: "1.5rem" }}>
                  <div
                    className="health-ring"
                    style={{ "--score": analysis.overall_health_score ?? 0 }}
                  >
                    <div
                      className={`health-ring-inner ${
                        (analysis.overall_health_score ?? 0) >= 70
                          ? "high"
                          : (analysis.overall_health_score ?? 0) >= 40
                          ? "medium"
                          : "low"
                      }`}
                    >
                      {analysis.overall_health_score ?? 0}%
                    </div>
                  </div>
                  <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
                    Overall health score
                  </p>
                </div>
                <div className="analysis-summary">
                  <div className="stat">
                    <span className="value">{analysis.overall_health_score ?? 0}%</span>
                    <span className="label">Health score</span>
                  </div>
                  <div className="stat healthy">
                    <span className="value">{analysis.chunks_healthy ?? 0}</span>
                    <span className="label">Healthy chunks</span>
                  </div>
                  <div className="stat mild">
                    <span className="value">{analysis.chunks_mild ?? 0}</span>
                    <span className="label">Mild</span>
                  </div>
                  <div className="stat severe">
                    <span className="value">{analysis.chunks_severe ?? 0}</span>
                    <span className="label">Severe</span>
                  </div>
                  <div className="stat">
                    <span className="value">{analysis.chunks_total ?? 0}</span>
                    <span className="label">Total chunks</span>
                  </div>
                  <div className="stat">
                    <span className="value">{analysis.processing_time_seconds ?? 0}s</span>
                    <span className="label">Processing time</span>
                  </div>
                </div>
                <div className="analysis-tabs-inner">
                  <button
                    type="button"
                    className={reportTab === "summary" ? "active" : ""}
                    onClick={() => setReportTab("summary")}
                  >
                    Summary
                  </button>
                  <button
                    type="button"
                    className={reportTab === "chunks" ? "active" : ""}
                    onClick={() => setReportTab("chunks")}
                  >
                    Chunk details
                  </button>
                </div>
                {reportTab === "summary" && (
                  <div className="report-section">
                    <h4>Dominant class</h4>
                    <p>
                      <span className={`class-badge ${analysis.dominant_class?.replace("_", "")}`}>
                        {classLabel(analysis.dominant_class)}
                      </span>
                    </p>
                    <h4>Image size</h4>
                    <p>{analysis.image_size_mb ?? 0} MB</p>
                  </div>
                )}
                {reportTab === "chunks" && analysis.chunk_results?.length > 0 && (
                  <div className="report-section">
                    <h4>Chunk results</h4>
                    <div className="chunk-grid">
                      {analysis.chunk_results.slice(0, 48).map((c) => (
                        <div key={c.chunk_id} className="chunk-card">
                          <span className={`class-badge ${c.predicted_class}`}>
                            {classLabel(c.predicted_class)}
                          </span>
                          <div className="conf">Conf: {(c.confidence * 100).toFixed(0)}%</div>
                          {c.severity_score != null && (
                            <div className="conf">Severity: {(c.severity_score * 100).toFixed(0)}%</div>
                          )}
                        </div>
                      ))}
                    </div>
                    {analysis.chunk_results.length > 48 && (
                      <p className="muted" style={{ marginTop: "0.75rem" }}>
                        + {analysis.chunk_results.length - 48} more chunks
                      </p>
                    )}
                  </div>
                )}
                <div className="download-bar">
                  <span className="muted">Download full report (JSON)</span>
                  <button
                    type="button"
                    onClick={() =>
                      api.downloadReport(analysis.analysis_id, getToken).catch(() =>
                        setUploadStatus({ type: "error", message: "Download failed" })
                      )
                    }
                  >
                    Download report
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="icon">📊</div>
                <h3>No report yet</h3>
                <p>Upload and analyze an image, or open one from History.</p>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="history-section">
            <p className="history-intro">Past analyses. Open any row to view the full report or download JSON.</p>
            {history.length > 0 ? (
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Date</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id}>
                        <td className="history-name">{item.original_filename}</td>
                        <td className="history-meta">{item.created_at}</td>
                        <td>
                          <span
                            className={`history-score ${
                              item.overall_health_score >= 70
                                ? "high"
                                : item.overall_health_score >= 40
                                ? "medium"
                                : "low"
                            }`}
                          >
                            {item.overall_health_score}%
                          </span>
                        </td>
                        <td>
                          <span className="history-status">Completed</span>
                        </td>
                        <td className="history-actions">
                          <button type="button" className="history-btn" onClick={() => openAnalysis(item.id)}>
                            View
                          </button>
                          <button
                            type="button"
                            className="history-btn primary"
                            onClick={() =>
                              api.downloadReport(item.id, getToken).catch(() =>
                                setUploadStatus({ type: "error", message: "Download failed" })
                              )
                            }
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="icon">📜</div>
                <h3>No history yet</h3>
                <p>Your analyses will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
