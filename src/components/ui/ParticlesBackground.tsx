import Particles, { initParticlesEngine } from '@tsparticles/react'
import type { ISourceOptions } from '@tsparticles/engine'
import { loadSlim } from '@tsparticles/slim'
import { useEffect, useMemo, useState } from 'react'

/** Matches :root in index.css — blue/violet accent, cool neutrals */
const ACCENT = '#5b8cff'
const ACCENT_2 = '#7c5cff'
const MUTED = '#8b98a8'
const MUTED_2 = '#6b7f99'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

function themedOptions(reducedMotion: boolean): ISourceOptions {
  return {
    autoPlay: true,
    background: { color: { value: 'transparent' } },
    fullScreen: { enable: false, zIndex: 0 },
    fpsLimit: reducedMotion ? 30 : 55,
    pauseOnBlur: true,
    detectRetina: true,
    interactivity: {
      detectsOn: 'window',
      events: {
        onHover: { enable: false, mode: [], parallax: { enable: false, force: 60, smooth: 10 } },
        onClick: { enable: false, mode: [] },
        onDiv: { enable: false, type: 'circle', mode: [] },
        resize: { enable: true, delay: 0.5 },
      },
    },
    particles: {
      number: {
        value: reducedMotion ? 28 : 50,
        density: { enable: true, width: 1220, height: 1220 },
      },
      color: { value: [ACCENT, ACCENT_2, MUTED, MUTED_2] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.12, max: 0.4 },
        animation: reducedMotion
          ? { enable: false }
          : {
              enable: true,
              speed: { min: 0.2, max: 0.52 },
              sync: false,
              mode: 'auto',
              startValue: 'random',
              destroy: 'none',
            },
      },
      size: {
        value: { min: 1, max: 2.5 },
        animation: reducedMotion
          ? { enable: false }
          : {
              enable: true,
              speed: { min: 1.05, max: 2.05 },
              sync: false,
              mode: 'auto',
              startValue: 'random',
              destroy: 'none',
            },
      },
      move: {
        enable: true,
        speed: reducedMotion ? 0.075 : { min: 0.14, max: 0.38 },
        direction: 'none',
        random: true,
        straight: false,
        outModes: { default: 'bounce' },
      },
      links: {
        enable: true,
        distance: reducedMotion ? 96 : 126,
        color: ACCENT,
        opacity: reducedMotion ? 0.05 : 0.095,
        width: 1,
        blink: false,
        consent: false,
        frequency: 1,
        shadow: {
          blur: 4,
          color: { value: ACCENT_2 },
          enable: true,
        },
        triangles: { enable: false },
        warp: false,
      },
    },
  } as ISourceOptions
}

export function ParticlesBackground() {
  const reducedMotion = usePrefersReducedMotion()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const options = useMemo(() => themedOptions(reducedMotion), [reducedMotion])

  if (!ready) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
    >
      <Particles
        id="chess-loop-particles"
        className="h-full w-full"
        options={options}
      />
    </div>
  )
}
