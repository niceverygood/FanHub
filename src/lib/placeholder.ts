/**
 * Deterministic monochrome gradient for placeholder thumbnails. Real content is
 * never shipped in seeds/placeholders (per project policy) — these abstract
 * dark gradients stand in. Stays within the palette: no new hues.
 */
const SHADES = ["#0B0B0B", "#131313", "#1A1A1A", "#242424", "#2E2E2E"];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function gradientFor(seed: string): string {
  const h = hash(seed);
  const a = SHADES[h % SHADES.length];
  const b = SHADES[(h >> 3) % SHADES.length];
  const angle = (h % 6) * 30 + 20;
  return `linear-gradient(${angle}deg, ${a}, ${b})`;
}
