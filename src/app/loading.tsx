/** Instant skeleton shown while a route's server data loads. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[600px] px-4 py-5">
      {/* hero */}
      <div className="h-36 animate-pulse rounded-card bg-surface" />

      {/* stories */}
      <div className="mt-5 flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-surface" />
        ))}
      </div>

      {/* feed */}
      <div className="mt-6 space-y-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-surface" />
              <div className="space-y-1.5">
                <div className="h-3 w-28 animate-pulse rounded bg-surface" />
                <div className="h-2.5 w-20 animate-pulse rounded bg-surface" />
              </div>
            </div>
            <div className="mt-3 aspect-[4/5] animate-pulse rounded-card bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
