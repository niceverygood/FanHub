export const siteConfig = {
  name: "FanHub",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://fanshub-flax.vercel.app",
  legalEntity: process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "FanHub 운영팀",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@fanshub.example",
  legalEmail: process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? "legal@fanshub.example",
  safetyEmail: process.env.NEXT_PUBLIC_SAFETY_EMAIL ?? "safety@fanshub.example",
  updatedAt: "2026-07-16",
};

export function mailto(email: string, subject?: string) {
  const params = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${email}${params}`;
}
