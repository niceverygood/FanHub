import { avatarBg } from "@/lib/placeholder";

/** Circular avatar — SFW portrait photo (demo) over a gradient fallback. */
export function Avatar({
  seed,
  name,
  size = 40,
  ring = false,
}: {
  seed: string;
  name: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-block shrink-0 overflow-hidden rounded-full bg-surface bg-cover bg-center ${
        ring ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : ""
      }`}
      style={{ width: size, height: size, backgroundImage: avatarBg(seed) }}
    />
  );
}
