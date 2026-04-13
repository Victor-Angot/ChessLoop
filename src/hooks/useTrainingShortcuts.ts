import { useEffect } from 'react'
import { useChessStore } from '../stores/useChessStore'

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return el.isContentEditable
}

export function useTrainingShortcuts() {
  const hint = useChessStore((s) => s.hint)
  const skip = useChessStore((s) => s.skip)
  const resetAttempt = useChessStore((s) => s.resetAttempt)
  const navPrev = useChessStore((s) => s.navPrev)
  const navNext = useChessStore((s) => s.navNext)
  const analysisPrev = useChessStore((s) => s.analysisPrev)
  const analysisNext = useChessStore((s) => s.analysisNext)
  const analysisNavToStart = useChessStore((s) => s.analysisNavToStart)
  const analysisNavToEnd = useChessStore((s) => s.analysisNavToEnd)
  const analysisEnabled = useChessStore((s) => s.analysisMode.enabled)
  const mainSection = useChessStore((s) => s.ui.mainSection)

  useEffect(() => {
    if (mainSection !== 'trainer') return

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (isTypingTarget(e.target)) return

      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault()
        hint()
        return
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        void skip()
        return
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        void resetAttempt()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (analysisEnabled) analysisPrev()
        else navPrev()
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (analysisEnabled) analysisNext()
        else navNext()
        return
      }
      if (e.key === 'Home' && analysisEnabled) {
        e.preventDefault()
        analysisNavToStart()
        return
      }
      if (e.key === 'End' && analysisEnabled) {
        e.preventDefault()
        analysisNavToEnd()
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    hint,
    skip,
    resetAttempt,
    navPrev,
    navNext,
    analysisPrev,
    analysisNext,
    analysisNavToStart,
    analysisNavToEnd,
    analysisEnabled,
    mainSection,
  ])
}
