import { variationNumberInSection } from '../../lib/lineSections'
import { useChessStore } from '../../stores/useChessStore'

export function TrainingHeader() {
  const session = useChessStore((s) => s.session)
  const lines = useChessStore((s) => s.lines)
  const hint = useChessStore((s) => s.hint)
  const skip = useChessStore((s) => s.skip)
  const resetAttempt = useChessStore((s) => s.resetAttempt)
  const endSession = useChessStore((s) => s.endSession)
  const excludeCurrentLineFromLearning = useChessStore(
    (s) => s.excludeCurrentLineFromLearning,
  )

  const line = lines.find((l) => l.id === session.currentLineId)
  const running = session.status === 'running'
  const disabled = !running
  const varMeta = line ? variationNumberInSection(lines, line) : null

  return (
    <header className="border-b border-[var(--border)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h2 className="text-lg font-semibold leading-tight">
          {line?.metadata.title ?? 'Training'}
        </h2>
        {varMeta && varMeta.total > 1 ? (
          <p className="muted mt-0.5 text-xs">
            Variation {varMeta.index} of {varMeta.total}
          </p>
        ) : null}
        {line?.metadata.subtitle ? (
          <p className="muted mt-0.5">{line.metadata.subtitle}</p>
        ) : null}
        <p className="muted mt-2 text-xs">
          Ply {session.plyIndex}/{line?.moves.length ?? 0} · Queue{' '}
          {session.done + 1}/{Math.max(session.total, 1)}
        </p>
        </div>
        <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={disabled}
          onClick={() => hint()}
        >
          Hint <span className="kbd">H</span>
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={disabled}
          onClick={() => void skip()}
        >
          Skip <span className="kbd">S</span>
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => void resetAttempt()}
        >
          Retry <span className="kbd">R</span>
        </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!line || line.excluded}
            onClick={() => void excludeCurrentLineFromLearning()}
            title="Exclude this line from future review/random sessions"
          >
            Exclude
          </button>
        <button type="button" className="btn" onClick={() => endSession()}>
          End session
        </button>
        </div>
      </div>
    </header>
  )
}
