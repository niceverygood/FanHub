import { avatarGradient, initialOf } from "@/lib/placeholder";

/** Gradient circle avatar with an initial — stands in for creator/user photos. */
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
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-text ${
        ring ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : ""
      }`}
      style={{
        width: size,
        height: size,
        backgroundImage: avatarGradient(seed),
        fontSize: Math.round(size * 0.42),
      }}
      aria-hidden
    >
      {initialOf(name)}
    </span>
  );
}
