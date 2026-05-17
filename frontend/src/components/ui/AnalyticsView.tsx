// AnalyticsView — Mahyco Dashboard
// Binned heatmap + stacked bars with human-readable labels
// No external chart library needed

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import * as api from "@/lib/api";
import { PlaygroundCanvas } from "@/components/ui/PlaygroundCanvas";
import { X } from "lucide-react";

interface ChunkResult {
  chunk_id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  predicted_class: string;
  confidence: number;
  severity_score?: number | null;
}

// ── Colour palette ────────────────────────────────────────────────────────────
const CLR = {
  healthy:          '#16a34a',   // green
  mild_infection:   '#f59e0b',   // amber
  severe_infection: '#dc2626',   // red
} as const;

const LABEL = {
  healthy:          'Healthy',
  mild_infection:   'Mild',
  severe_infection: 'Severe',
} as const;

type ClassKey = keyof typeof CLR;

// ── Binning helper ────────────────────────────────────────────────────────────
interface Bin {
  key: string;          // "0–500"
  rangeStart: number;
  rangeEnd: number;
  healthy: number;
  mild: number;
  severe: number;
}

function buildBins(
  chunks: ChunkResult[],
  axis: 'x' | 'y',
  binCount: number
): Bin[] {
  if (!chunks.length) return [];
  const vals = chunks.map(c => c[axis]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (min === max) binCount = 1;
  const step = Math.ceil((max - min + 1) / binCount);

  const bins: Bin[] = Array.from({ length: binCount }, (_, i) => ({
    key: `${min + i * step}–${Math.min(min + (i + 1) * step - 1, max)}`,
    rangeStart: min + i * step,
    rangeEnd:   min + (i + 1) * step - 1,
    healthy: 0,
    mild: 0,
    severe: 0,
  }));

  chunks.forEach(c => {
    const v = c[axis];
    const idx = Math.min(Math.floor((v - min) / step), binCount - 1);
    const b = bins[idx];
    if (c.predicted_class === 'healthy')          b.healthy++;
    else if (c.predicted_class === 'mild_infection') b.mild++;
    else                                           b.severe++;
  });

  return bins.filter(b => b.healthy + b.mild + b.severe > 0);
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="text-[var(--text-muted)] text-sm text-center">No data</p>;

  let angle = -Math.PI / 2;
  const R = 70, r = 44, cx = 90, cy = 90;

  const slices = data.map(d => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    angle += sweep;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    const ri1 = { x: cx + r * Math.cos(angle - sweep), y: cy + r * Math.sin(angle - sweep) };
    const ri2 = { x: cx + r * Math.cos(angle),           y: cy + r * Math.sin(angle) };
    const large = sweep > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ri2.x} ${ri2.y} A ${r} ${r} 0 ${large} 0 ${ri1.x} ${ri1.y} Z`;
    return { ...d, path, pct: Math.round((d.value / total) * 100) };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap justify-center">
      <svg width={180} height={180}>
        {slices.map(s => (
          <path key={s.label} d={s.path} fill={s.color} opacity={0.9}>
            <title>{s.label}: {s.value} ({s.pct}%)</title>
          </path>
        ))}
        <text x={cx} y={cy - 6}  textAnchor="middle" fill="var(--text-primary)" fontSize={20} fontWeight={700}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)"  fontSize={11}>plants</text>
      </svg>
      <div className="space-y-2">
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[var(--text-secondary)]">{LABEL[s.label as ClassKey] || s.label}</span>
            <span className="font-semibold text-[var(--text-primary)] ml-auto pl-4">
              {s.value} <span className="text-[var(--text-muted)] font-normal">({s.pct}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Binned Stacked Bar Chart ──────────────────────────────────────────────────
function BinnedStackedBar({ bins, axis }: { bins: Bin[]; axis: string }) {
  if (!bins.length) return <p className="text-[var(--text-muted)] text-sm">No data</p>;

  const maxVal = Math.max(...bins.map(b => b.healthy + b.mild + b.severe));
  const BAR_H = 32;
  const GAP   = 8;
  const PL    = 90;   // left padding for labels
  const W     = 320;  // bar width area
  const TOP   = 20;
  const height = TOP + bins.length * (BAR_H + GAP) + 20;

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${W + PL + 60} ${height}`} style={{ minWidth: 380 }}>
        {/* Axis header */}
        <text x={2} y={TOP - 4} fill="var(--text-muted)" fontSize={10} fontWeight={600}>{axis} Range (px)</text>

        {bins.map((b, i) => {
          const y    = TOP + i * (BAR_H + GAP);
          const safe = maxVal || 1;
          const wH   = (b.healthy / safe) * W;
          const wM   = (b.mild    / safe) * W;
          const wS   = (b.severe  / safe) * W;
          const total = b.healthy + b.mild + b.severe;

          return (
            <g key={b.key}>
              {/* Bin label */}
              <text
                x={PL - 6} y={y + BAR_H / 2}
                textAnchor="end" fill="var(--text-muted)"
                fontSize={9} dominantBaseline="middle"
              >
                {b.key}
              </text>

              {/* Background track */}
              <rect x={PL} y={y} width={W} height={BAR_H} fill="var(--surface)" rx={4} opacity={0.4} />

              {/* Stacked segments */}
              {b.healthy > 0 && (
                <rect x={PL} y={y} width={wH} height={BAR_H} fill={CLR.healthy} rx={4}>
                  <title>Healthy: {b.healthy}</title>
                </rect>
              )}
              {b.mild > 0 && (
                <rect x={PL + wH} y={y} width={wM} height={BAR_H} fill={CLR.mild_infection} rx={2}>
                  <title>Mild: {b.mild}</title>
                </rect>
              )}
              {b.severe > 0 && (
                <rect x={PL + wH + wM} y={y} width={wS} height={BAR_H} fill={CLR.severe_infection} rx={2}>
                  <title>Severe: {b.severe}</title>
                </rect>
              )}

              {/* Count badges inside bars */}
              {wH > 22 && (
                <text x={PL + wH / 2} y={y + BAR_H / 2} textAnchor="middle"
                  fill="white" fontSize={10} fontWeight={700} dominantBaseline="middle">
                  {b.healthy}
                </text>
              )}
              {wM > 22 && (
                <text x={PL + wH + wM / 2} y={y + BAR_H / 2} textAnchor="middle"
                  fill="white" fontSize={10} fontWeight={700} dominantBaseline="middle">
                  {b.mild}
                </text>
              )}
              {wS > 22 && (
                <text x={PL + wH + wM + wS / 2} y={y + BAR_H / 2} textAnchor="middle"
                  fill="white" fontSize={10} fontWeight={700} dominantBaseline="middle">
                  {b.severe}
                </text>
              )}

              {/* Total on right */}
              <text
                x={PL + W + 6} y={y + BAR_H / 2}
                fill="var(--text-muted)" fontSize={10} dominantBaseline="middle"
              >
                {total}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${PL}, ${height - 14})`}>
          {[
            { label: 'Healthy', color: CLR.healthy },
            { label: 'Mild',    color: CLR.mild_infection },
            { label: 'Severe',  color: CLR.severe_infection },
          ].map((l, i) => (
            <g key={l.label} transform={`translate(${i * 80}, 0)`}>
              <rect width={10} height={10} fill={l.color} rx={2} />
              <text x={14} y={9} fill="var(--text-muted)" fontSize={9}>{l.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

// ── Binned Heatmap Grid ───────────────────────────────────────────────────────
// Each cell = one (colBin × rowBin) intersection
// Shows coloured dot badges for each class count
function BinnedHeatmap({
  chunks,
  colBins,
  rowBins,
  onCellClick,
}: {
  chunks: ChunkResult[];
  colBins: Bin[];
  rowBins: Bin[];
  onCellClick: (colBin: Bin, rowBin: Bin) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Build a 2D map: rowBinIdx → colBinIdx → counts
  type Cell = { healthy: number; mild: number; severe: number };
  const grid: Cell[][] = rowBins.map(() =>
    colBins.map(() => ({ healthy: 0, mild: 0, severe: 0 }))
  );

  chunks.forEach(c => {
    const ci = colBins.findIndex(b => c.x >= b.rangeStart && c.x <= b.rangeEnd);
    const ri = rowBins.findIndex(b => c.y >= b.rangeStart && c.y <= b.rangeEnd);
    if (ci < 0 || ri < 0) return;
    const cell = grid[ri][ci];
    if (c.predicted_class === 'healthy')           cell.healthy++;
    else if (c.predicted_class === 'mild_infection') cell.mild++;
    else                                            cell.severe++;
  });

  // Cell sizes
  const CELL_W = Math.max(64, Math.min(110, Math.floor(680 / colBins.length)));
  const CELL_H = 56;

  return (
    <div className="overflow-auto">
      <table
        style={{ borderCollapse: 'separate', borderSpacing: 3 }}
        className="text-xs select-none"
      >
        {/* Column headers */}
        <thead>
          <tr>
            {/* empty corner */}
            <th className="text-[var(--text-muted)] text-right pr-2 pb-1 font-medium text-xs whitespace-nowrap">
              Y ↓ / X →
            </th>
            {colBins.map(cb => (
              <th
                key={cb.key}
                style={{ width: CELL_W }}
                className="text-center text-[var(--text-muted)] pb-1 font-medium"
              >
                <span className="block truncate" style={{ maxWidth: CELL_W }}>
                  {cb.key}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rowBins.map((rb, ri) => (
            <tr key={rb.key}>
              {/* Row header */}
              <td className="text-right pr-2 text-[var(--text-muted)] font-medium whitespace-nowrap">
                {rb.key}
              </td>

              {colBins.map((_, ci) => {
                const cell = grid[ri][ci];
                const total = cell.healthy + cell.mild + cell.severe;
                const key = `${ri}-${ci}`;
                const isEmpty = total === 0;

                // Dominant class background tint
                let bgTint = 'transparent';
                if (!isEmpty) {
                  const dom = cell.healthy >= cell.mild && cell.healthy >= cell.severe
                    ? CLR.healthy
                    : cell.mild >= cell.severe
                    ? CLR.mild_infection
                    : CLR.severe_infection;
                  bgTint = dom + '18';   // ~10% opacity tint
                }

                return (
                  <td
                    key={key}
                    onMouseEnter={() => setHovered(key)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => !isEmpty && onCellClick(colBins[ci], rb)}
                    style={{
                      width: CELL_W,
                      height: CELL_H,
                      background: isEmpty ? 'var(--surface-raised)' : bgTint,
                      border: `1px solid ${hovered === key ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      borderRadius: 6,
                      cursor: isEmpty ? 'default' : 'pointer',
                      transition: 'border-color 0.15s',
                      position: 'relative',
                    }}
                  >
                    {isEmpty ? (
                      <div className="w-full h-full flex items-center justify-center opacity-20 text-[var(--text-muted)]">
                        —
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 h-full py-1">
                        {/* Three coloured badges: green / amber / red */}
                        <div className="flex gap-1 items-center flex-wrap justify-center">
                          {/* Healthy */}
                          <span
                            style={{
                              background: CLR.healthy,
                              color: '#fff',
                              borderRadius: 999,
                              minWidth: 22,
                              height: 16,
                              fontSize: 9,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0 4px',
                              opacity: cell.healthy > 0 ? 1 : 0.2,
                            }}
                            title={`Healthy: ${cell.healthy}`}
                          >
                            {cell.healthy}
                          </span>
                          {/* Mild */}
                          <span
                            style={{
                              background: CLR.mild_infection,
                              color: '#fff',
                              borderRadius: 999,
                              minWidth: 22,
                              height: 16,
                              fontSize: 9,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0 4px',
                              opacity: cell.mild > 0 ? 1 : 0.2,
                            }}
                            title={`Mild: ${cell.mild}`}
                          >
                            {cell.mild}
                          </span>
                          {/* Severe */}
                          <span
                            style={{
                              background: CLR.severe_infection,
                              color: '#fff',
                              borderRadius: 999,
                              minWidth: 22,
                              height: 16,
                              fontSize: 9,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0 4px',
                              opacity: cell.severe > 0 ? 1 : 0.2,
                            }}
                            title={`Severe: ${cell.severe}`}
                          >
                            {cell.severe}
                          </span>
                        </div>
                        {/* Total */}
                        <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>
                          total: {total}
                        </span>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs text-[var(--text-muted)] flex-wrap">
        {(Object.entries(LABEL) as [ClassKey, string][]).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span
              className="inline-block rounded-full"
              style={{ background: CLR[k], width: 10, height: 10 }}
            />
            {v}
          </span>
        ))}
        <span className="ml-2 opacity-60">Each cell shows: 🟢 healthy · 🟡 mild · 🔴 severe count</span>
      </div>
    </div>
  );
}

// ── Main AnalyticsView ────────────────────────────────────────────────────────
export function AnalyticsView({ analysis }: { analysis: any }) {
  const chunks: ChunkResult[] = analysis.chunk_results || [];

  // Bin count slider
  const [binCount, setBinCount] = useState(8);
  const [selectedCell, setSelectedCell] = useState<{ col: Bin; row: Bin } | null>(null);

  if (!chunks.length) {
    return (
      <div className="py-12 text-center text-[var(--text-muted)]">
        No chunk data available for analytics.
      </div>
    );
  }

  // Distribution donut
  const dist = [
    { label: 'healthy',          value: chunks.filter(c => c.predicted_class === 'healthy').length,          color: CLR.healthy },
    { label: 'mild_infection',   value: chunks.filter(c => c.predicted_class === 'mild_infection').length,   color: CLR.mild_infection },
    { label: 'severe_infection', value: chunks.filter(c => c.predicted_class === 'severe_infection').length, color: CLR.severe_infection },
  ];

  // Build bins for both axes
  const colBins = buildBins(chunks, 'x', binCount);
  const rowBins = buildBins(chunks, 'y', binCount);

  // Confidence / severity metrics
  const avgConf = (cls: string) => {
    const arr = chunks.filter(c => c.predicted_class === cls).map(c => c.confidence);
    return arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length * 100).toFixed(1) : '—';
  };
  const infected = chunks.filter(c => c.predicted_class !== 'healthy' && c.severity_score != null);
  const avgSev = infected.length
    ? (infected.reduce((s, c) => s + (c.severity_score ?? 0), 0) / infected.length * 100).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Health Score',         value: `${analysis.overall_health_score ?? 0}%`,                          color: 'text-[#16a34a]' },
          { label: 'Avg Severity Index',   value: avgSev === '—' ? '—' : `${avgSev}%`,                              color: 'text-[#f59e0b]' },
          { label: 'Avg Conf. (Healthy)',  value: avgConf('healthy') === '—' ? '—' : `${avgConf('healthy')}%`,      color: 'text-[var(--text-primary)]' },
          { label: 'Avg Conf. (Severe)',   value: avgConf('severe_infection') === '—' ? '—' : `${avgConf('severe_infection')}%`, color: 'text-[#dc2626]' },
        ].map(m => (
          <div key={m.label} className="bg-[var(--surface-raised)] rounded-xl p-4 border border-[var(--border-subtle)]">
            <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wide">{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── Distribution donut ── */}
      <div className="bg-[var(--surface-raised)] rounded-xl p-5 border border-[var(--border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-wide">
          Class Distribution
        </h4>
        <DonutChart data={dist} />
      </div>

      {/* ── Bin count control ── */}
      <div className="bg-[var(--surface-raised)] rounded-xl p-4 border border-[var(--border-subtle)] flex items-center gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Bin / Zone Size</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Groups the image into <strong>{binCount}×{binCount}</strong> zones. Fewer bins = bigger zones, easier to read.
          </p>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          {[4, 6, 8, 10, 12].map(n => (
            <button
              key={n}
              onClick={() => setBinCount(n)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                binCount === n
                  ? 'bg-accent text-white border-accent'
                  : 'bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-accent/50'
              }`}
            >
              {n}×{n}
            </button>
          ))}
        </div>
      </div>

      {/* ── Binned Heatmap ── */}
      <div className="bg-[var(--surface-raised)] rounded-xl p-5 border border-[var(--border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1 uppercase tracking-wide">
          Spatial Heatmap — Zoned Grid
        </h4>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Each cell represents a spatial zone. Badges show count of&nbsp;
          <span style={{ color: CLR.healthy, fontWeight: 700 }}>Healthy</span>&nbsp;·&nbsp;
          <span style={{ color: CLR.mild_infection, fontWeight: 700 }}>Mild</span>&nbsp;·&nbsp;
          <span style={{ color: CLR.severe_infection, fontWeight: 700 }}>Severe</span>&nbsp;
          plants detected in that zone.
        </p>
        <BinnedHeatmap chunks={chunks} colBins={colBins} rowBins={rowBins} onCellClick={(c, r) => setSelectedCell({ col: c, row: r })} />
      </div>

      {/* ── Binned stacked bars ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--surface-raised)] rounded-xl p-5 border border-[var(--border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1 uppercase tracking-wide">
            Row-wise Analysis
          </h4>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Grouped by vertical position (Y axis) — each bar = one horizontal zone across the field.
          </p>
          <BinnedStackedBar bins={rowBins} axis="Y" />
        </div>

        <div className="bg-[var(--surface-raised)] rounded-xl p-5 border border-[var(--border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1 uppercase tracking-wide">
            Column-wise Analysis
          </h4>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Grouped by horizontal position (X axis) — each bar = one vertical zone across the field.
          </p>
          <BinnedStackedBar bins={colBins} axis="X" />
        </div>
      </div>

      {selectedCell && (
        <CellDetailModal
          analysisId={analysis.analysis_id}
          cellBox={{
            minX: selectedCell.col.rangeStart,
            maxX: selectedCell.col.rangeEnd,
            minY: selectedCell.row.rangeStart,
            maxY: selectedCell.row.rangeEnd,
            colName: selectedCell.col.key,
            rowName: selectedCell.row.key
          }}
          chunks={chunks}
          onClose={() => setSelectedCell(null)}
        />
      )}
    </div>
  );
}

// ── Cell Detail Modal ────────────────────────────────────────────────────────
function CellDetailModal({
  analysisId,
  cellBox,
  chunks,
  onClose,
}: {
  analysisId: string | number;
  cellBox: { minX: number; maxX: number; minY: number; maxY: number; colName: string; rowName: string };
  chunks: ChunkResult[];
  onClose: () => void;
}) {
  const [imgData, setImgData] = useState<{ url: string; scaleX: number; scaleY: number } | null>(null);
  
  useEffect(() => {
    let active = true;
    api.getAnalysisOrthomosaic(analysisId).then(data => {
      if (active) setImgData(data);
    }).catch(console.error);
    return () => { active = false; };
  }, [analysisId]);

  const cellPolygon = [
    { x: cellBox.minX, y: cellBox.minY },
    { x: cellBox.maxX, y: cellBox.minY },
    { x: cellBox.maxX, y: cellBox.maxY },
    { x: cellBox.minX, y: cellBox.maxY }
  ];

  const cellChunks = chunks.filter(
    c => c.x >= cellBox.minX && c.x <= cellBox.maxX && c.y >= cellBox.minY && c.y <= cellBox.maxY
  );

  const healthy = cellChunks.filter(c => c.predicted_class === 'healthy');
  const mild = cellChunks.filter(c => c.predicted_class === 'mild_infection');
  const severe = cellChunks.filter(c => c.predicted_class === 'severe_infection');
  const total = cellChunks.length;

  const infected = cellChunks.filter(c => c.predicted_class !== 'healthy' && c.severity_score != null);
  const avgSev = infected.length
    ? (infected.reduce((s, c) => s + (c.severity_score ?? 0), 0) / infected.length * 100).toFixed(1)
    : '—';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl w-full h-full max-w-7xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Zone Detail</h2>
            <p className="text-xs text-[var(--text-muted)]">X: {cellBox.colName} | Y: {cellBox.rowName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          {/* Canvas area */}
          <div className="flex-1 relative bg-[#0f172a]">
            {imgData ? (
              <PlaygroundCanvas
                chunks={cellChunks}
                imageUrl={imgData.url}
                imageScaleX={imgData.scaleX}
                imageScaleY={imgData.scaleY}
                polygon={cellPolygon}
                autoFocusPolygon={true}
                hideHUD={true}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                Loading image...
              </div>
            )}
          </div>
          
          {/* Stats area */}
          <div className="w-full md:w-80 bg-[var(--surface-raised)] border-l border-[var(--border-subtle)] p-6 overflow-y-auto">
            <h3 className="font-semibold text-[var(--text-primary)] mb-6 uppercase tracking-wide text-sm">Zone Statistics</h3>
            
            <div className="space-y-4">
              <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border-subtle)] text-center">
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-1">{total}</div>
                <div className="text-xs text-[var(--text-muted)] uppercase">Plants Detected</div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[var(--surface)] p-3 rounded-xl border border-[var(--border-subtle)] text-center">
                  <div className="text-xl font-bold text-[#16a34a] mb-1">{healthy.length}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Healthy</div>
                </div>
                <div className="bg-[var(--surface)] p-3 rounded-xl border border-[var(--border-subtle)] text-center">
                  <div className="text-xl font-bold text-[#f59e0b] mb-1">{mild.length}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Mild</div>
                </div>
                <div className="bg-[var(--surface)] p-3 rounded-xl border border-[var(--border-subtle)] text-center">
                  <div className="text-xl font-bold text-[#dc2626] mb-1">{severe.length}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Severe</div>
                </div>
              </div>

              {total > 0 && (
                <>
                  <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border-subtle)]">
                    <h4 className="text-xs text-[var(--text-muted)] uppercase mb-2">Dominant Class</h4>
                    <div className="flex items-center gap-2">
                      {healthy.length >= mild.length && healthy.length >= severe.length && (
                        <><span className="w-3 h-3 rounded-full bg-[#16a34a]"></span><span className="text-sm font-medium">Healthy</span></>
                      )}
                      {mild.length > healthy.length && mild.length >= severe.length && (
                        <><span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span><span className="text-sm font-medium">Mild</span></>
                      )}
                      {severe.length > healthy.length && severe.length > mild.length && (
                        <><span className="w-3 h-3 rounded-full bg-[#dc2626]"></span><span className="text-sm font-medium">Severe</span></>
                      )}
                    </div>
                  </div>

                  <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border-subtle)]">
                    <h4 className="text-xs text-[var(--text-muted)] uppercase mb-1">Avg Severity Index</h4>
                    <div className="text-2xl font-bold text-[#f59e0b]">{avgSev === '—' ? '—' : `${avgSev}%`}</div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-tight">
                      Score of infected plants in this zone. Severe=100%, Mild=50%.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
