import { lazy, Suspense } from 'react'

const ParticlesBackground = lazy(() =>
  import('./ParticlesBackground').then((m) => ({
    default: m.ParticlesBackground,
  })),
)

export function LazyParticlesBackground() {
  return (
    <Suspense fallback={null}>
      <ParticlesBackground />
    </Suspense>
  )
}
