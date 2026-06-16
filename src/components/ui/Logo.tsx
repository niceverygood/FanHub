/**
 * FanHub wordmark — modern bold sans (Pretendard) with a tight track and an
 * accent dot. Replaces the editorial serif logo for a cleaner SNS feel.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`font-sans font-extrabold tracking-tight text-text ${className ?? ""}`}>
      FanHub<span className="text-accent">.</span>
    </span>
  );
}
