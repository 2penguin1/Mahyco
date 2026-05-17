import { useState, useEffect, useMemo } from "react";
import * as api from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { PlaygroundCanvas, rectIntersectsPolygon } from "@/components/ui/PlaygroundCanvas";
import type { ChunkResult } from "@/components/ui/PlaygroundCanvas";
import { MousePointer2, Trash2, CheckCircle2, History, Map } from "lucide-react";
import toast from "react-hot-toast";
import { usePipelineSettings } from "@/lib/context/PipelineSettingsContext";

export default function PlaygroundPage() {
  const { settings } = usePipelineSettings();
  const [history, setHistory] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState({ x: 1, y: 1 });
  const [imageLoading, setImageLoading] = useState(false);
  
  // Canvas state
  const [drawingMode, setDrawingMode] = useState(false);
  const [polygon, setPolygon] = useState<{ x: number; y: number }[]>([]);
  const [filterActive, setFilterActive] = useState(false);

  useEffect(() => {
    api.getHistory(0, 50).then(setHistory).catch(() => toast.error("Failed to load history"));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setAnalysis(null);
      setImageUrl(null);
      setPolygon([]);
      setFilterActive(false);
      return;
    }
    api.getAnalysis(selectedId)
      .then(data => {
        setAnalysis(data);
        setPolygon([]);
        setFilterActive(false);
      })
      .catch(() => toast.error("Failed to load analysis details"));
      
    // Fetch preferred image source for playground visualization.
    setImageLoading(true);
    const primary =
      settings.preferredPlaygroundImage === "classified"
        ? api.getAnalysisVisual(selectedId)
        : api.getAnalysisOrthomosaic(selectedId);
    const fallback =
      settings.preferredPlaygroundImage === "classified"
        ? api.getAnalysisOrthomosaic(selectedId)
        : api.getAnalysisVisual(selectedId);

    primary
      .then(({ url, scaleX, scaleY }) => {
        setImageUrl(url);
        setImageScale({ x: scaleX, y: scaleY });
        setImageLoading(false);
      })
      .catch(() => {
        fallback
          .then(({ url, scaleX, scaleY }) => {
            setImageUrl(url);
            setImageScale({ x: scaleX, y: scaleY });
            setImageLoading(false);
          })
          .catch((err) => {
            console.warn("No playground image source available:", err);
            setImageLoading(false);
          });
      });
  }, [selectedId, settings.preferredPlaygroundImage]);

  const chunks: ChunkResult[] = analysis?.chunk_results || [];

  // Determine which chunks to highlight
  const highlightIds = useMemo(() => {
    if (!filterActive || polygon.length < 3) return new Set<number>();
    const ids = new Set<number>();
    chunks.forEach(c => {
      if (rectIntersectsPolygon(c.x, c.y, c.width, c.height, polygon)) {
        ids.add(c.chunk_id);
      }
    });
    return ids;
  }, [chunks, polygon, filterActive]);

  // Compute stats for the sidebar panel
  const stats = useMemo(() => {
    const targetChunks = highlightIds.size > 0 ? chunks.filter(c => highlightIds.has(c.chunk_id)) : chunks;
    let healthy = 0, mild = 0, severe = 0;
    targetChunks.forEach(c => {
      if (c.predicted_class === "healthy") healthy++;
      else if (c.predicted_class === "mild_infection") mild++;
      else severe++;
    });
    return {
      total: targetChunks.length,
      healthy, mild, severe,
      score: targetChunks.length ? Math.round((healthy / targetChunks.length) * 100) : 0
    };
  }, [chunks, highlightIds]);

  const handleAddPoint = (pt: { x: number; y: number }) => {
    setPolygon(prev => [...prev, pt]);
  };

  const handleApplyFilter = () => {
    if (polygon.length < 3) {
      toast.error("Draw a polygon with at least 3 points first");
      return;
    }
    setFilterActive(true);
    setDrawingMode(false);
  };

  const handleClear = () => {
    setPolygon([]);
    setFilterActive(false);
    setDrawingMode(false);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <PageHeader title="Playground — Interactive ROI Map" />

      <div className="flex gap-4 flex-wrap">
        <div className="w-80 shrink-0">
          <Select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            options={[
              { value: "", label: "Select analysis from history..." },
              ...history.map(h => ({ value: h.id.toString(), label: h.original_filename }))
            ]}
          />
        </div>
        
        {analysis && (
          <div className="flex gap-2 items-center bg-[var(--surface-raised)] rounded-lg p-1 border border-[var(--border-subtle)] ml-auto">
            <Button
              variant={drawingMode ? "primary" : "secondary"}
              onClick={() => { setDrawingMode(!drawingMode); setFilterActive(false); }}
              className="h-9 px-3 text-sm"
            >
              <MousePointer2 size={16} className="mr-2" />
              {drawingMode ? "Drawing..." : "Draw ROI"}
            </Button>
            
            <Button
              variant="secondary"
              onClick={handleApplyFilter}
              disabled={polygon.length < 3 || filterActive}
              className="h-9 px-3 text-sm text-[var(--color-success)]"
            >
              <CheckCircle2 size={16} className="mr-2" /> Apply
            </Button>
            
            <Button
              variant="secondary"
              onClick={handleClear}
              disabled={polygon.length === 0}
              className="h-9 px-3 text-sm text-[var(--color-danger)]"
            >
              <Trash2 size={16} className="mr-2" /> Clear
            </Button>
          </div>
        )}
      </div>

      {!analysis ? (
        <Card className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] border-dashed border-2 bg-[var(--surface-raised)]/30">
          <History size={48} className="mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-[var(--text-primary)]">Select an Analysis</h3>
          <p className="mt-2 text-sm max-w-md text-center">
            Choose an orthomosaic from your history to start drawing regions of interest and filtering plant health metrics spatially.
          </p>
        </Card>
      ) : (
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Main Canvas Area */}
          <Card className="flex-1 overflow-hidden relative border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
            {drawingMode && (
              <div className="absolute top-4 left-4 z-10 bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-primary)] text-xs font-medium px-3 py-1.5 rounded-lg pointer-events-none flex items-center">
                <MousePointer2 size={14} className="mr-2" />
                Click to draw polygon points
              </div>
            )}
            
            {/* Loading overlay while selected playground image is fetched */}
            {imageLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--surface)]/90 text-[var(--text-muted)]">
                <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full mb-4" />
                <p className="text-sm font-medium">Loading playground image…</p>
                <p className="text-xs mt-1 opacity-60">Fetching classified output / orthomosaic</p>
              </div>
            )}
            
            <PlaygroundCanvas
              chunks={chunks}
              imageUrl={imageUrl}
              imageScaleX={imageScale.x}
              imageScaleY={imageScale.y}
              polygon={polygon}
              onAddPoint={handleAddPoint}
              drawingMode={drawingMode}
              highlightIds={highlightIds}
            />
          </Card>

          {/* Side Panel Stats */}
          <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">
            <Card className="p-5 border border-[var(--border-subtle)] shadow-sm">
              <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center">
                <Map size={18} className="mr-2 text-accent" />
                Region Statistics
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-[var(--surface-raised)] rounded-lg text-center border border-[var(--border-default)]">
                  <div className="text-3xl font-bold text-accent">{stats.score}%</div>
                  <div className="text-xs text-[var(--text-muted)] uppercase tracking-widest mt-1">Health Score</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[var(--surface-raised)] rounded-lg border border-[var(--border-default)] flex flex-col items-center">
                    <div className="text-xl font-semibold text-[var(--text-primary)]">{stats.total}</div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1">Total</div>
                  </div>
                  <div className="p-3 bg-[var(--surface-raised)] rounded-lg border border-[var(--border-default)] flex flex-col items-center">
                    <div className="text-xl font-semibold text-[var(--color-success)]">{stats.healthy}</div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1">Healthy</div>
                  </div>
                  <div className="p-3 bg-[var(--surface-raised)] rounded-lg border border-[var(--border-default)] flex flex-col items-center">
                    <div className="text-xl font-semibold text-[var(--color-warning)]">{stats.mild}</div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1">Mild</div>
                  </div>
                  <div className="p-3 bg-[var(--surface-raised)] rounded-lg border border-[var(--border-default)] flex flex-col items-center">
                    <div className="text-xl font-semibold text-[var(--color-danger)]">{stats.severe}</div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1">Severe</div>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card className="p-5 flex-1 border border-[var(--border-subtle)] bg-[var(--surface-raised)]/30">
               <h4 className="font-medium text-xs text-[var(--text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                 <span>How to use</span>
               </h4>
               <ul className="text-sm text-[var(--text-secondary)] space-y-3 list-none">
                 <li className="flex gap-2">
                   <span className="text-[var(--text-muted)]">🖱️</span> Pan the canvas by clicking and dragging.
                 </li>
                 <li className="flex gap-2">
                   <span className="text-[var(--text-muted)]">🔎</span> Zoom using your mouse scroll wheel.
                 </li>
                 <li className="flex gap-2">
                   <span className="text-[var(--text-muted)]">✏️</span> Click <strong>Draw ROI</strong> to start tracing a polygon.
                 </li>
                 <li className="flex gap-2">
                   <span className="text-[var(--text-muted)]">📍</span> Click on the map to add vertices.
                 </li>
                 <li className="flex gap-2">
                   <span className="text-[var(--text-muted)]">✅</span> Click <strong>Apply</strong> to filter the stats to only plants inside your shape.
                 </li>
               </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
