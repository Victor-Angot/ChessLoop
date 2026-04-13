import { ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { Chessboard, ChessboardProvider } from 'react-chessboard'
import type { Arrow } from 'react-chessboard'
import { useAuth } from '../auth/useAuth'
import { useChessStore } from '../stores/useChessStore'
import {
  ANALYSIS_DEPTH_MAX,
  ANALYSIS_DEPTH_MIN,
  type AnalysisMultiPv,
  type ReviewMode,
  type StoreState,
} from '../stores/chess/storeTypes'

const ANALYSIS_DEPTH_OPTIONS = Array.from(
  { length: ANALYSIS_DEPTH_MAX - ANALYSIS_DEPTH_MIN + 1 },
  (_, i) => ANALYSIS_DEPTH_MIN + i,
)
import type { StockfishScore } from '../types/stockfishDisplay'
import { Board } from './Board'
import { EvalBar } from './review/EvalBar'
import { SegmentedControl } from './ui/SegmentedControl'
import { TrainingFooterPanel } from './review/TrainingFooterPanel'
import { TrainingHeader } from './review/TrainingHeader'
import { ReviewModeToggle } from './review/ReviewModeToggle'

function expectedFromTo(fen: string, san: string) {
  const c = new Chess(fen)
  const m = c.move(san, { strict: false })
  if (!m) return null
  return { from: m.from, to: m.to }
}

function formatScore(s: StockfishScore): string {
  if (s.type === 'mate') return `Mate ${s.value > 0 ? '+' : ''}${s.value}`
  return (s.value / 100).toFixed(2)
}

function pvArrow(uci: string, color: string): Arrow | null {
  if (uci.length < 4) return null
  return {
    startSquare: uci.slice(0, 2),
    endSquare: uci.slice(2, 4),
    color,
  }
}

function parseUciMove(uci: string): { from: string; to: string; promotion?: string } | null {
  const t = uci.trim().toLowerCase()
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(t)) return null
  return {
    from: t.slice(0, 2),
    to: t.slice(2, 4),
    promotion: t.length >= 5 ? t[4] : undefined,
  }
}

function playAnalysisMove(uci: string) {
  const m = parseUciMove(uci)
  if (!m) return
  useChessStore.getState().analysisMove(m.from, m.to, m.promotion ?? 'q')
}

export function ReviewSession() {
  const { user: authUser, status: authStatus } = useAuth()
  const canUseRepertoires = authStatus === 'ready' && authUser !== null

  const analysisMode = useChessStore((s) => s.analysisMode)
  const exitAnalysisMode = useChessStore((s) => s.exitAnalysisMode)
  const analysisMove = useChessStore((s) => s.analysisMove)
  const analysisPrev = useChessStore((s) => s.analysisPrev)
  const analysisNext = useChessStore((s) => s.analysisNext)
  const analysisNavToEnd = useChessStore((s) => s.analysisNavToEnd)
  const setAnalysisMultiPv = useChessStore((s) => s.setAnalysisMultiPv)
  const setAnalysisTargetDepth = useChessStore((s) => s.setAnalysisTargetDepth)
  const session = useChessStore((s) => s.session)
  const board = useChessStore((s) => s.board)
  const lines = useChessStore((s) => s.lines)
  const filters = useChessStore((s) => s.filters)
  const reviewMode = useChessStore((s) => s.reviewMode)
  const setReviewMode = useChessStore((s) => s.setReviewMode)
  const startSession = useChessStore((s) => s.startSession)
  const startRandomSession = useChessStore((s) => s.startRandomSession)
  const submitMove = useChessStore((s) => s.submitMove)
  const setFilters = useChessStore((s) => s.setFilters)

  const line = useMemo(
    () => lines.find((l) => l.id === session.currentLineId),
    [lines, session.currentLineId],
  )

  const titleOptions = useMemo(() => {
    const set = new Set<string>()
    for (const l of lines) {
      if (filters.repertoireId && l.repertoireId !== filters.repertoireId) {
        continue
      }
      set.add(l.metadata.title)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [lines, filters.repertoireId])

  const incorrectFromTo = useMemo(() => {
    if (session.overlay?.type !== 'incorrect') return null
    return expectedFromTo(board.fen, session.overlay.expectedSAN)
  }, [session.overlay, board.fen])

  const atLive = board.historyIndex === board.history.length - 1
  const allowTrainDrag =
    atLive && session.status === 'running' && !analysisMode.enabled

  const trainingBoardOrientation = line?.metadata.color === 'black' ? 'black' : 'white'

  const analysisArrows = useMemo((): Arrow[] => {
    const pvColors = [
      'rgba(98, 153, 36, 0.95)',
      'rgba(70, 130, 210, 0.92)',
      'rgba(200, 140, 60, 0.9)',
    ]
    const out: Arrow[] = []
    const top = analysisMode.lines.slice(0, analysisMode.multiPv)
    top.forEach((ln, i) => {
      const u = ln.pv[0]
      const a = u ? pvArrow(u, pvColors[i] ?? pvColors[0]!) : null
      if (a) out.push(a)
    })
    return out
  }, [analysisMode.lines, analysisMode.multiPv])

  const analysisAtLive =
    analysisMode.historyIndex === analysisMode.history.length - 1

  if (analysisMode.enabled) {
    return (
      <section className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
          <div>
            <h2 className="text-lg font-semibold">Analysis mode</h2>
            <p className="muted text-sm">
              Stockfish MultiPV — set target depth below; higher values use more CPU time.
            </p>
          </div>
          <button type="button" className="btn" onClick={() => exitAnalysisMode()}>
            Exit analysis
          </button>
        </header>
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
          <div className="space-y-3">
            <div className="mx-auto grid w-full max-w-[680px] grid-cols-[auto_1fr] items-stretch gap-3 sm:gap-4 lg:max-w-[720px]">
              <EvalBar
                fen={analysisMode.fen}
                score={analysisMode.lines[0]?.score ?? null}
                analyzing={analysisMode.analyzing}
              />
              <div className="aspect-square min-h-0 min-w-0 w-full">
                <ChessboardProvider
                  options={{
                    id: 'analysis-board',
                    position: analysisMode.fen,
                    boardOrientation: trainingBoardOrientation,
                    allowDragging: true,
                    animationDurationInMs: 150,
                    arrows: analysisArrows,
                    onPieceDrop: ({ sourceSquare, targetSquare }) => {
                      if (!targetSquare) return false
                      analysisMove(sourceSquare, targetSquare)
                      return true
                    },
                  }}
                >
                  <Chessboard />
                </ChessboardProvider>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
              <button
                type="button"
                className="btn btn-icon"
                aria-label="Previous position"
                disabled={analysisMode.historyIndex <= 0}
                onClick={() => analysisPrev()}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="btn btn-icon"
                aria-label="Next position"
                disabled={analysisMode.historyIndex >= analysisMode.history.length - 1}
                onClick={() => analysisNext()}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="btn btn-icon"
                aria-label="Jump to latest position"
                disabled={
                  analysisMode.history.length === 0 ||
                  analysisMode.historyIndex >= analysisMode.history.length - 1
                }
                onClick={() => analysisNavToEnd()}
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
              <span className="muted text-xs">
                Position {analysisMode.historyIndex + 1}/{analysisMode.history.length}
                {!analysisAtLive ? ' · read-only' : ''}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="field">
              <span className="label" id="analysis-lines-label">
                Engine lines
              </span>
              <SegmentedControl
                className="mt-1.5 w-full max-w-none"
                ariaLabelledBy="analysis-lines-label"
                value={String(analysisMode.multiPv) as '1' | '2' | '3'}
                onChange={(v) => setAnalysisMultiPv(Number(v) as AnalysisMultiPv)}
                options={[
                  { value: '1', label: '1' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                ]}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="analysis-target-depth">
                Target depth
              </label>
              <select
                id="analysis-target-depth"
                className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm"
                value={analysisMode.targetDepth}
                onChange={(e) =>
                  setAnalysisTargetDepth(Number(e.target.value))
                }
              >
                {ANALYSIS_DEPTH_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} ply
                  </option>
                ))}
              </select>
            </div>
            <div className="subcard panel text-sm">
              <div className="label">Reached depth</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {analysisMode.analyzing ? '…' : analysisMode.depth}
              </div>
              {analysisMode.analyzing ? (
                <p className="muted mt-1 text-xs">Analyzing…</p>
              ) : analysisMode.depth > 0 &&
                analysisMode.depth < analysisMode.targetDepth ? (
                <p className="muted mt-1 text-xs">
                  Stopped before target (time limit). Try a lower target or wait
                  for a faster position.
                </p>
              ) : null}
            </div>
            <ul className="space-y-2">
              {analysisMode.lines.map((ln, i) => {
                const m0 = ln.pv[0]
                const canClick = !analysisMode.analyzing && analysisAtLive
                const p0 = m0 ? parseUciMove(m0) : null
                const chipClass =
                  i === 0
                    ? 'border-[rgba(98,153,36,0.55)] bg-[rgba(98,153,36,0.12)] text-emerald-100 hover:bg-[rgba(98,153,36,0.22)]'
                    : i === 1
                      ? 'border-[rgba(70,130,210,0.55)] bg-[rgba(70,130,210,0.14)] text-sky-100 hover:bg-[rgba(70,130,210,0.24)]'
                      : 'border-[rgba(200,140,60,0.55)] bg-[rgba(200,140,60,0.12)] text-amber-100 hover:bg-[rgba(200,140,60,0.2)]'
                return (
                  <li key={ln.multipv} className="subcard p-3 text-xs">
                    <div className="flex justify-between gap-2 font-semibold">
                      <span>Line {ln.multipv}</span>
                      <span>{formatScore(ln.score)}</span>
                    </div>
                    {m0 ? (
                      <div className="mt-2">
                        <button
                          type="button"
                          disabled={!canClick || !p0}
                          title="Play this move"
                          onClick={() => m0 && playAnalysisMove(m0)}
                          className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold font-mono transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${chipClass}`}
                        >
                          {m0}
                        </button>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </section>
    )
  }

  if (session.status === 'idle') {
    return <IdleHomeSection
      canUseRepertoires={canUseRepertoires}
      authStatus={authStatus}
      startSession={startSession}
      startRandomSession={startRandomSession}
      reviewMode={reviewMode}
      setReviewMode={setReviewMode}
      filters={filters}
      setFilters={setFilters}
      titleOptions={titleOptions}
    />
  }

  return (
    <section className="card overflow-hidden">
      <TrainingHeader />
      <div className="p-4">
        <Board
          fen={board.fen}
          boardOrientation={line?.metadata.color ?? 'white'}
          allowDrag={allowTrainDrag}
          onUserMove={(from, to, promotion) => submitMove(from, to, promotion)}
          lastOpponentMove={
            board.lastOpponentMove
              ? { from: board.lastOpponentMove.from, to: board.lastOpponentMove.to }
              : null
          }
          hintSquares={board.hintSquares}
          incorrectExpected={incorrectFromTo}
        />
      </div>
      <TrainingFooterPanel incorrectFromTo={incorrectFromTo} />
    </section>
  )
}

function IdleHomeSection({
  canUseRepertoires,
  authStatus,
  startSession,
  startRandomSession,
  reviewMode,
  setReviewMode,
  filters,
  setFilters,
  titleOptions,
}: {
  canUseRepertoires: boolean
  authStatus: 'loading' | 'ready'
  startSession: () => Promise<void>
  startRandomSession: (opts?: { title?: string | null }) => Promise<void>
  reviewMode: ReviewMode
  setReviewMode: (m: ReviewMode) => void
  filters: StoreState['filters']
  setFilters: (p: Partial<StoreState['filters']>) => void
  titleOptions: string[]
}) {
  const [idleFen, setIdleFen] = useState(() => new Chess().fen())

  const onIdleMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      const c = new Chess(idleFen)
      const moves = c.moves({ square: from as Square, verbose: true })
      const match = moves.find((m) => m.to === to)
      if (!match) return
      const r = c.move({
        from,
        to,
        promotion: match.promotion ? (promotion ?? 'q') : undefined,
      })
      if (r) setIdleFen(c.fen())
    },
    [idleFen],
  )

  return (
      <section className="card">
        <div className="grid gap-8 p-5 sm:p-6">
          <div className="flex w-full min-w-0 justify-center">
            <Board
              fen={idleFen}
              boardOrientation="white"
              allowDrag
              onUserMove={onIdleMove}
              lastOpponentMove={null}
              hintSquares={null}
              incorrectExpected={null}
              boardWrapperClassName="aspect-square w-full max-w-[min(92vw,364px)] sm:max-w-[406px] md:max-w-[448px] lg:max-w-[min(100%,476px)]"
            />
          </div>
          <div className="mx-auto w-full min-w-0 max-w-md space-y-5 sm:max-w-lg">
            {canUseRepertoires ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={() => void startSession()}
                >
                  Start review
                </button>
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={() => void startRandomSession()}
                >
                  Start random
                </button>
                <ReviewModeToggle value={reviewMode} onChange={setReviewMode} />
                <label className="field">
                  <span className="label">Opening filter</span>
                  <select
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm"
                    value={filters.title ?? ''}
                    onChange={(e) =>
                      setFilters({
                        title: e.target.value || null,
                      })
                    }
                  >
                    <option value="">All titles</option>
                    {titleOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : authStatus === 'loading' ? (
              <p className="muted text-sm">Checking your session…</p>
            ) : (
              <>
                <p className="muted text-sm leading-relaxed">
                  Sign in to use your repertoires. Lines you import are stored in
                  your browser only for your account on this device.
                </p>
                <Link to="/login" className="btn btn-primary w-full">
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="btn btn-ghost w-full text-[var(--muted)]"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
  )
}
