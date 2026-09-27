export default function Loading() {
  return (
    <div
      className="flex flex-col gap-10"
      role="status"
      aria-label="Loading SonicPrep"
    >
      <div className="h-72 animate-pulse rounded-3xl bg-card" />
      <div className="space-y-5">
        <div className="h-8 w-48 animate-pulse rounded bg-card" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-48 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading SonicPrep…</span>
    </div>
  );
}
