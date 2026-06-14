/** Minimal inline sparkline. Accent stroke, no axes — exchange texture. */
export function Sparkline({ data, width = 84, height = 24 }: { data: number[]; width?: number; height?: number }) {
  if (data.length === 0) return <span className="text-text-muted">—</span>;
  const max = Math.max(1, ...data);
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="text-accent" aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
