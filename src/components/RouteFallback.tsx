/** Minimal placeholder while lazy route chunks load (login vs app shell). */
export function RouteFallback() {
  return (
    <div className="container-app flex min-h-[40vh] items-center justify-center py-16">
      <p className="text-sm text-[var(--muted)]" role="status" aria-live="polite">
        Loading…
      </p>
    </div>
  )
}
