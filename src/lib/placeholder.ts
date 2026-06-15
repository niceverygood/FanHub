/**
 * Deterministic placeholders. Real content is never shipped (project policy);
 * these abstract gradients stand in. Palette stays on-brand: dark neutrals +
 * the single accent (#F3701F) used sparingly as a warm glow so the feed has
 * life without introducing new hues.
 */
const SHADES = ["#0B0B0B", "#131313", "#1A1A1A", "#242424", "#2E2E2E", "#363636"];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Gradient templates; some carry a subtle accent glow (still palette-safe).
const MEDIA_TEMPLATES: ((a: string, b: string) => string)[] = [
  (a, b) => `linear-gradient(135deg, ${a}, ${b})`,
  (a, b) => `radial-gradient(circle at 30% 25%, ${b}, ${a})`,
  (a, _b) => `linear-gradient(160deg, ${a} 55%, rgba(243,112,31,0.16))`,
  (a, _b) => `radial-gradient(circle at 75% 80%, rgba(243,112,31,0.22), ${a})`,
  (a, b) => `conic-gradient(from 210deg at 70% 30%, ${b}, ${a}, ${b})`,
  (a, b) => `linear-gradient(120deg, ${a}, ${b} 70%, rgba(243,112,31,0.12))`,
];

export function gradientFor(seed: string): string {
  const h = hash(seed);
  const a = SHADES[h % SHADES.length];
  const b = SHADES[(h >> 3) % (SHADES.length - 1) + 1];
  const tpl = MEDIA_TEMPLATES[h % MEDIA_TEMPLATES.length]!;
  return tpl(a!, b!);
}

/** Slightly brighter gradient for circular avatars, with an accent lean. */
export function avatarGradient(seed: string): string {
  const h = hash(seed + "av");
  const a = SHADES[(h % 3) + 2]!; // mid/light neutral
  const useAccent = h % 3 === 0;
  return useAccent
    ? `linear-gradient(135deg, ${a}, rgba(243,112,31,0.55))`
    : `linear-gradient(135deg, ${a}, ${SHADES[(h >> 4) % SHADES.length]})`;
}

/** First display character for avatar fallback initials. */
export function initialOf(name: string): string {
  const c = name.trim().replace(/^@/, "").charAt(0);
  return (c || "?").toUpperCase();
}
