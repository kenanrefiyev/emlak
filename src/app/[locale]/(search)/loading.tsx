export default function Loading() {
  return (
    <div className="shell pt-8" aria-busy="true">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-mist" />
      <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded bg-mist" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <div className="hidden h-[32rem] animate-pulse rounded-2xl bg-mist lg:block" />
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="card overflow-hidden">
              <div className="aspect-[4/3] animate-pulse bg-mist" />
              <div className="space-y-2 p-4">
                <div className="h-6 w-28 animate-pulse rounded bg-mist" />
                <div className="h-4 w-full animate-pulse rounded bg-mist" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-mist" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
