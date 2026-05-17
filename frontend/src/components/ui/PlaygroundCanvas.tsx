/**
 * PlaygroundCanvas
 * Renders the original orthomosaic image as background (served from the backend as a
 * high-quality JPEG thumbnail) and overlays colored bounding-boxes from chunk_results.
 * Supports pan (drag), zoom (scroll), and click-to-place polygon ROI vertices.
 */
import { useRef, useEffect, useCallback, useState } from "react";

export interface ChunkResult {
  chunk_id: number;
  x: number; y: number;
  width: number; height: number;
  predicted_class: string;
  confidence: number;
  severity_score?: number | null;
}

interface Props {
  chunks: ChunkResult[];
  imageUrl?: string | null;
  /** Scale factors: how many original pixels correspond to one thumbnail pixel.
   *  e.g. if original was 10000px wide and thumbnail is 4096px, scaleX = 10000/4096 ≈ 2.44
   *  The chunk coordinates are in original pixel space, so we divide by these to map onto the thumbnail. */
  imageScaleX?: number;
  imageScaleY?: number;
  polygon: { x: number; y: number }[];
  onAddPoint?: (pt: { x: number; y: number }) => void;
  drawingMode?: boolean;
  highlightIds?: Set<number>;
  autoFocusPolygon?: boolean;
  hideHUD?: boolean;
}

// Class color map (with fill alpha variants)
const COLORS: Record<string, { stroke: string; fillDim: string; fillBright: string }> = {
  healthy:          { stroke: "#22c55e", fillDim: "rgba(34,197,94,0.10)",  fillBright: "rgba(34,197,94,0.30)" },
  mild_infection:   { stroke: "#f59e0b", fillDim: "rgba(245,158,11,0.10)", fillBright: "rgba(245,158,11,0.30)" },
  severe_infection: { stroke: "#ef4444", fillDim: "rgba(239,68,68,0.10)",  fillBright: "rgba(239,68,68,0.30)" },
};
const FALLBACK_COLOR = { stroke: "#6b7280", fillDim: "rgba(107,114,128,0.10)", fillBright: "rgba(107,114,128,0.30)" };

// ── Point-in-polygon (ray casting) ──────────────────────────────────────────
export function pointInPolygon(px: number, py: number, poly: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

export function rectIntersectsPolygon(
  rx: number, ry: number, rw: number, rh: number,
  poly: { x: number; y: number }[]
): boolean {
  if (poly.length < 3) return false;
  return [
    { x: rx,        y: ry },
    { x: rx + rw,   y: ry },
    { x: rx,        y: ry + rh },
    { x: rx + rw,   y: ry + rh },
    { x: rx + rw/2, y: ry + rh/2 },
  ].some(c => pointInPolygon(c.x, c.y, poly));
}

// ── Component ────────────────────────────────────────────────────────────────
export function PlaygroundCanvas({
  chunks, imageUrl, imageScaleX = 1, imageScaleY = 1,
  polygon, onAddPoint = () => {}, drawingMode = false, highlightIds = new Set(),
  autoFocusPolygon = false, hideHUD = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef({ zoom: 1, panX: 0, panY: 0, dragging: false, lastX: 0, lastY: 0, centred: false });
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);

  // Load thumbnail image when URL changes
  useEffect(() => {
    if (!imageUrl) { setImgObj(null); return; }
    const img = new Image();
    img.onload = () => {
      setImgObj(img);
      // Reset pan/zoom and centre on new image
      stateRef.current.centred = false;
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // ── World-space bounds ─────────────────────────────────────────────────────
  // Everything is in the ORIGINAL image coordinate space (chunk x/y are in original pixels).
  // The thumbnail img is smaller by imageScaleX/Y; when drawing we stretch it to fill world space.
  const worldW = imgObj ? imgObj.naturalWidth  * imageScaleX : Math.max(...chunks.map(c => c.x + c.width),  1000);
  const worldH = imgObj ? imgObj.naturalHeight * imageScaleY : Math.max(...chunks.map(c => c.y + c.height), 1000);

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = stateRef.current;
    const W = canvas.width, H = canvas.height;

    // Fit-scale: maps one world pixel → canvas pixels at zoom=1
    const fitScale = Math.min(W / (worldW || 1), H / (worldH || 1)) * 0.95;

    // Auto-centre once per image load
    if (!s.centred && imgObj) {
      if (autoFocusPolygon && polygon.length > 0) {
        const minX = Math.min(...polygon.map(p => p.x));
        const maxX = Math.max(...polygon.map(p => p.x));
        const minY = Math.min(...polygon.map(p => p.y));
        const maxY = Math.max(...polygon.map(p => p.y));
        
        const polyW = Math.max(maxX - minX, 10);
        const polyH = Math.max(maxY - minY, 10);
        
        // targetZoom is mathematically W / (polyW * fitScale)
        // Since fitScale = W / worldW, targetZoom = worldW / polyW
        // This makes it completely independent of canvas size W being 0!
        const targetZoom = Math.min(worldW / polyW, worldH / polyH) * 0.85;
        
        s.zoom = Math.max(0.1, Math.min(targetZoom || 1, 40));
        
        const polyCx = minX + polyW / 2;
        const polyCy = minY + polyH / 2;
        
        // Fallback if W is 0
        const safeW = W || 800;
        const safeH = H || 600;
        
        s.panX = safeW / 2 - polyCx * fitScale * s.zoom;
        s.panY = safeH / 2 - polyCy * fitScale * s.zoom;
      } else {
        s.panX = (W - worldW * fitScale) / 2;
        s.panY = (H - worldH * fitScale) / 2;
        s.zoom = 1;
      }
      s.centred = true;
    }

    ctx.clearRect(0, 0, W, H);

    // Dark background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    // World → canvas helper
    const toC = (wx: number, wy: number) => ({
      cx: s.panX + wx * fitScale * s.zoom,
      cy: s.panY + wy * fitScale * s.zoom,
    });

    // ── 1. Draw the orthomosaic background ─────────────────────────────────
    if (imgObj) {
      const imgCW = imgObj.naturalWidth  * imageScaleX * fitScale * s.zoom; // = worldW * fitScale * zoom
      const imgCH = imgObj.naturalHeight * imageScaleY * fitScale * s.zoom;
      ctx.drawImage(imgObj, s.panX, s.panY, imgCW, imgCH);
    } else {
      // Fallback: subtle grid so the canvas doesn't look empty
      ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 1;
      const step = 60 * fitScale * s.zoom;
      for (let x = s.panX % step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = s.panY % step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }

    // ── 2. Draw bounding-box overlays ──────────────────────────────────────
    const filterOn = highlightIds.size > 0;
    chunks.forEach(c => {
      const { cx, cy } = toC(c.x, c.y);
      const cw = c.width  * fitScale * s.zoom;
      const ch = c.height * fitScale * s.zoom;
      const highlighted = highlightIds.has(c.chunk_id);
      const col = COLORS[c.predicted_class] ?? FALLBACK_COLOR;

      if (filterOn) {
        if (highlighted) {
          // Bright solid box for selected region
          ctx.fillStyle   = col.fillBright;
          ctx.strokeStyle = col.stroke;
          ctx.lineWidth   = 2;
          ctx.globalAlpha = 1;
        } else {
          // Dimmed: very faint
          ctx.fillStyle   = col.fillDim;
          ctx.strokeStyle = col.stroke;
          ctx.lineWidth   = 0.5;
          ctx.globalAlpha = 0.2;
        }
      } else {
        ctx.fillStyle   = col.fillDim;
        ctx.strokeStyle = col.stroke;
        ctx.lineWidth   = 1;
        ctx.globalAlpha = 0.85;
      }

      ctx.beginPath();
      ctx.rect(cx, cy, cw, ch);
      ctx.fill();
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // ── 3. Draw ROI polygon ────────────────────────────────────────────────
    if (polygon.length > 0) {
      const pts = polygon.map(p => toC(p.x, p.y));

      // Filled area
      ctx.beginPath();
      ctx.moveTo(pts[0].cx, pts[0].cy);
      pts.slice(1).forEach(p => ctx.lineTo(p.cx, p.cy));
      if (polygon.length >= 3) ctx.closePath();
      ctx.fillStyle = "rgba(239,68,68,0.08)";
      ctx.fill();

      // Dashed border
      ctx.beginPath();
      ctx.moveTo(pts[0].cx, pts[0].cy);
      pts.slice(1).forEach(p => ctx.lineTo(p.cx, p.cy));
      if (polygon.length >= 3) ctx.closePath();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth   = 2.5;
      ctx.setLineDash([7, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Vertex dots
      pts.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, 5, 0, Math.PI * 2);
        ctx.fillStyle   = i === 0 ? "#fbbf24" : "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      });
    }

    // ── 4. HUD ────────────────────────────────────────────────────────────
    if (!hideHUD) {
      const hudText = imgObj
        ? `Zoom: ${s.zoom.toFixed(2)}×  |  ${chunks.length} detections`
        : `Zoom: ${s.zoom.toFixed(2)}×  |  Loading image…`;
      ctx.fillStyle = "rgba(15,23,42,0.75)";
      ctx.fillRect(8, 8, 280, 24);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.fillText(hudText, 14, 24);
    }
  }, [chunks, imgObj, imageScaleX, imageScaleY, polygon, highlightIds, worldW, worldH, autoFocusPolygon, hideHUD]);

  // ── Canvas world coordinate from canvas pixel ──────────────────────────────
  const toWorld = useCallback((cx: number, cy: number) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const fitScale = Math.min(canvas.width / (worldW || 1), canvas.height / (worldH || 1)) * 0.95;
    return {
      x: (cx - s.panX) / (fitScale * s.zoom),
      y: (cy - s.panY) / (fitScale * s.zoom),
    };
  }, [worldW, worldH]);

  // ── Resize observer ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      stateRef.current.centred = false; // re-centre after resize
      draw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const s = stateRef.current;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    s.panX = mx - (mx - s.panX) * factor;
    s.panY = my - (my - s.panY) * factor;
    s.zoom = Math.min(Math.max(s.zoom * factor, 0.05), 80);
    draw();
  }, [draw]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (drawingMode) return;
    const s = stateRef.current;
    s.dragging = true; s.lastX = e.clientX; s.lastY = e.clientY;
  }, [drawingMode]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current;
    if (s.dragging) {
      s.panX += e.clientX - s.lastX;
      s.panY += e.clientY - s.lastY;
      s.lastX = e.clientX; s.lastY = e.clientY;
      draw();
    }
  }, [draw]);

  const onMouseUp = useCallback(() => { stateRef.current.dragging = false; }, []);

  const onClick = useCallback((e: React.MouseEvent) => {
    if (!drawingMode) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    onAddPoint(toWorld(e.clientX - rect.left, e.clientY - rect.top));
  }, [drawingMode, onAddPoint, toWorld]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block", cursor: drawingMode ? "crosshair" : "grab" }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onClick={onClick}
    />
  );
}
