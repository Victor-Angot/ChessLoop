import { Chess } from 'chess.js'
import { create } from 'zustand'
import { importRepertoireFromPgn } from '../data/chessData'
import { loadSnapshot } from '../db/database'
import {
  bulkUpsertLines,
  deleteRepertoire as dbDeleteRepertoire,
  getAllLines,
  getDueLines,
  hasTrainerDatabase,
} from '../db/database'
import { snapshotToStockfishLines } from '../engine/analysisSnapshotToLines'
import { reviewLine } from '../engine/spacedRepetition'
import { ensureStockfishEngine } from '../engine/stockfishClient'
import type { ChessLine, ReviewQuality, TrainerColor } from '../types/chess.types'
import {
  ANALYSIS_DEPTH_DEFAULT,
  ANALYSIS_DEPTH_MAX,
  ANALYSIS_DEPTH_MIN,
  type AnalysisModeState,
  type AnalysisMultiPv,
  type BoardSnapshot,
  type BoardState,
  type LastOpponentMove,
  type MainSection,
  type SessionState,
  type StoreState,
  computeQualitySuccess,
  isUsersTurn,
} from './chess/storeTypes'

type ChessStore = StoreState & {
  reloadFromDb: () => Promise<void>
  importPGN: (
    pgn: string,
    repertoireName: string,
    side: TrainerColor,
  ) => Promise<{
    imported: number
    failedBlocks: number
    parsedBlocks: number
  }>
  removeRepertoire: (id: string) => Promise<void>
  upsertLinesAndRefresh: (lines: ChessLine[]) => Promise<void>
  getDueLinesFromDb: (now: Date) => Promise<ChessLine[]>
  setFilters: (
    p: Partial<StoreState['filters']>,
  ) => void
  setNow: (ms: number) => void
  setReviewMode: (m: StoreState['reviewMode']) => void
  toggleLinesPanel: () => void
  toggleImportPanel: () => void
  setLinesPanelOpen: (open: boolean) => void
  setImportPanelOpen: (open: boolean) => void
  setMainSection: (s: MainSection) => void
  startSession: () => Promise<void>
  startRandomSession: (opts?: { title?: string | null }) => Promise<void>
  startLineSession: (lineId: string) => Promise<void>
  setLineExcluded: (lineId: string, excluded: boolean) => Promise<void>
  excludeCurrentLineFromLearning: () => Promise<void>
  resetAttempt: () => Promise<void>
  hint: () => void
  skip: () => Promise<void>
  submitMove: (from: string, to: string, promotion?: string) => void
  continueAfterMistake: () => void
  next: () => Promise<void>
  endSession: () => void
  navPrev: () => void
  navNext: () => void
  navToEnd: () => void
  enterAnalysisMode: () => void
  exitAnalysisMode: () => void
  setAnalysisMultiPv: (n: AnalysisMultiPv) => void
  setAnalysisTargetDepth: (depth: number) => void
  analysisMove: (from: string, to: string, promotion?: string) => void
  analysisPrev: () => void
  analysisNext: () => void
  analysisNavToStart: () => void
  analysisNavToEnd: () => void
}

function emptyBoard(): BoardState {
  const chess = new Chess()
  const fen = chess.fen()
  return {
    chess,
    fen,
    hintSquares: null,
    lastOpponentMove: null,
    history: [{ fen, lastOpponentMove: null, lineMovesApplied: 0 }],
    historyIndex: 0,
  }
}

/** Replay from line start; `null` if movetext does not reach `nextMovePly` (SAN/FEN mismatch). */
function boardStateAtLinePly(
  line: ChessLine,
  userColor: TrainerColor,
  nextMovePly: number,
): { board: BoardState; syncPly: number } | null {
  const history = buildTrainingLineHistory(line, userColor, nextMovePly)
  const lastSnap = history[history.length - 1]!
  const applied = lastSnap.lineMovesApplied ?? 0
  if (applied !== nextMovePly) return null
  const chessAt = new Chess(lastSnap.fen)
  const board: BoardState = {
    chess: chessAt,
    fen: lastSnap.fen,
    hintSquares: null,
    lastOpponentMove: lastSnap.lastOpponentMove,
    history,
    historyIndex: history.length - 1,
  }
  return { board, syncPly: applied }
}

function collectMistakePlies(session: SessionState, line: ChessLine): number[] {
  const raw = session.mistakeUserPlies
  const list = Array.isArray(raw) ? raw : []
  return [...new Set(list)]
    .filter((n) => Number.isInteger(n) && n >= 0 && n < line.moves.length)
    .sort((a, b) => a - b)
}

function addMistakePly(session: SessionState, ply: number): number[] {
  const arr = [...(session.mistakeUserPlies ?? [])]
  if (!arr.includes(ply)) arr.push(ply)
  return arr
}

function boardStateFromHistoryAtApplied(
  board: BoardState,
  targetApplied: number,
): BoardState | null {
  const idxExact = board.history.findIndex((s) => s.lineMovesApplied === targetApplied)
  const idx =
    idxExact >= 0
      ? idxExact
      : // Fallback: pick the latest snapshot not past the target.
        board.history.reduce((best, s, i) => {
          const applied = s.lineMovesApplied
          if (applied == null) return best
          if (applied <= targetApplied && i > best) return i
          return best
        }, -1)
  if (idx < 0) return null
  const snap = board.history[idx]!
  const chess = new Chess(snap.fen)
  // Remediation should be playable (not "read-only history"). Make this snapshot the live end.
  const history = board.history.slice(0, idx + 1)
  return {
    ...board,
    chess,
    fen: snap.fen,
    hintSquares: null,
    lastOpponentMove: snap.lastOpponentMove,
    history,
    historyIndex: history.length - 1,
  }
}

function boardStateFromSnapshotsAtApplied(
  boardBase: BoardState,
  snapshots: BoardSnapshot[],
  targetApplied: number,
): BoardState | null {
  const idxExact = snapshots.findIndex((s) => s.lineMovesApplied === targetApplied)
  const idx =
    idxExact >= 0
      ? idxExact
      : snapshots.reduce((best, s, i) => {
          const applied = s.lineMovesApplied
          if (applied == null) return best
          if (applied <= targetApplied && i > best) return i
          return best
        }, -1)
  if (idx < 0) return null
  const snap = snapshots[idx]!
  const chess = new Chess(snap.fen)
  // Make this snapshot the live end for training input.
  const history = snapshots.slice(0, idx + 1)
  return {
    ...boardBase,
    chess,
    fen: snap.fen,
    hintSquares: null,
    lastOpponentMove: snap.lastOpponentMove,
    history,
    historyIndex: history.length - 1,
  }
}

function buildTrainingLineHistory(
  line: ChessLine,
  userColor: TrainerColor,
  nextMoveIndex: number,
): BoardSnapshot[] {
  const chess = new Chess(line.startFEN ?? undefined)
  let lastOpponentMove: LastOpponentMove = null
  const history: BoardSnapshot[] = [
    { fen: chess.fen(), lastOpponentMove: null, lineMovesApplied: 0 },
  ]
  for (let p = 0; p < nextMoveIndex; p++) {
    const played = chess.move(line.moves[p]!, { strict: false })
    if (!played) break
    if (!isUsersTurn(userColor, p)) {
      lastOpponentMove = {
        from: played.from,
        to: played.to,
        san: played.san,
      }
    }
    history.push({
      fen: chess.fen(),
      lastOpponentMove,
      lineMovesApplied: p + 1,
    })
  }
  return history
}

/** Movetime ceiling for UCI `go depth … movetime …` (higher depth needs more wall time in the browser). */
function analysisMovetimeForTargetDepth(targetDepth: number): number {
  return Math.min(90_000, Math.max(600, targetDepth * 450))
}

function clampAnalysisTargetDepth(raw: number): number {
  const n = Math.round(raw)
  return Math.min(ANALYSIS_DEPTH_MAX, Math.max(ANALYSIS_DEPTH_MIN, n))
}

/** Bumps on each new analysis request or exit — stale async results are ignored. */
let analysisJobId = 0

function emptyAnalysis(): AnalysisModeState {
  return {
    enabled: false,
    chess: new Chess(),
    fen: new Chess().fen(),
    history: [{ fen: new Chess().fen() }],
    historyIndex: 0,
    depth: 0,
    lines: [],
    analyzing: false,
    multiPv: 2,
    targetDepth: ANALYSIS_DEPTH_DEFAULT,
  }
}

function runStockfishJob(
  fen: string,
  set: (partial: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) => void,
  multiPv: AnalysisMultiPv,
  targetDepth: number,
) {
  const jobId = ++analysisJobId
  void (async () => {
    try {
      const eng = await ensureStockfishEngine()
      if (jobId !== analysisJobId) return
      const snap = await eng.analyze(
        fen,
        targetDepth,
        multiPv,
        analysisMovetimeForTargetDepth(targetDepth),
      )
      if (jobId !== analysisJobId) return
      const lines = snapshotToStockfishLines(snap)
      const depth = lines.length ? Math.max(...lines.map((l) => l.depth)) : 0
      set((s) => ({
        analysisMode: {
          ...s.analysisMode,
          depth,
          lines,
          analyzing: false,
        },
      }))
    } catch {
      if (jobId !== analysisJobId) return
      set((s) => ({
        analysisMode: {
          ...s.analysisMode,
          depth: 0,
          lines: [],
          analyzing: false,
        },
      }))
    }
  })()
}

function initialSession(): SessionState {
  return {
    queue: [],
    currentLineId: null,
    done: 0,
    total: 0,
    status: 'idle',
    plyIndex: 0,
    userColor: 'white',
    mistakeUserPlies: [],
    remediation: null,
    attempt: { usedHint: false, madeMistake: false, correctUserPlies: 0 },
    overlay: null,
  }
}

function filterLine(
  line: ChessLine,
  filters: StoreState['filters'],
  titleOverride: string | null | undefined,
): boolean {
  if (filters.repertoireId && line.repertoireId !== filters.repertoireId) {
    return false
  }
  const t = titleOverride !== undefined ? titleOverride : filters.title
  if (t && !line.metadata.title.toLowerCase().includes(t.toLowerCase())) {
    return false
  }
  if (filters.color && line.metadata.color !== filters.color) return false
  return true
}

function randInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0
  try {
    const c = globalThis.crypto
    if (c?.getRandomValues) {
      const x = new Uint32Array(1)
      c.getRandomValues(x)
      return x[0]! % maxExclusive
    }
  } catch {
    // ignore
  }
  return Math.floor(Math.random() * maxExclusive)
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}

async function persistLine(line: ChessLine): Promise<void> {
  await bulkUpsertLines([line])
}

export const useChessStore = create<ChessStore>()((set, get) => ({
  lines: [],
  repertoires: [],
  clockNowMs: Date.now(),
  reviewMode: 'continue',
  ui: {
    showLinesPanel: false,
    showImportPanel: false,
    mainSection: 'trainer',
    randomRecentStarts: [],
  },
  filters: { repertoireId: null, title: null, color: null },
  session: initialSession(),
  board: emptyBoard(),
  analysisMode: emptyAnalysis(),

  setNow: (ms) => set({ clockNowMs: ms }),

  setReviewMode: (reviewMode) => set({ reviewMode }),

  toggleLinesPanel: () =>
    set((s) => {
      const next = !s.ui.showLinesPanel
      return {
        ui: {
          ...s.ui,
          showLinesPanel: next,
          showImportPanel: next ? false : s.ui.showImportPanel,
        },
      }
    }),

  toggleImportPanel: () =>
    set((s) => {
      const next = !s.ui.showImportPanel
      return {
        ui: {
          ...s.ui,
          showImportPanel: next,
          showLinesPanel: next ? false : s.ui.showLinesPanel,
        },
      }
    }),

  setLinesPanelOpen: (open) =>
    set((s) => ({ ui: { ...s.ui, showLinesPanel: open } })),

  setImportPanelOpen: (open) =>
    set((s) => ({ ui: { ...s.ui, showImportPanel: open } })),

  setMainSection: (mainSection) =>
    set((s) => ({ ui: { ...s.ui, mainSection } })),

  setFilters: (p) =>
    set((s) => ({ filters: { ...s.filters, ...p } })),

  getDueLinesFromDb: (now) => getDueLines(now),

  reloadFromDb: async () => {
    if (!hasTrainerDatabase()) {
      const s = get()
      set({
        lines: [],
        repertoires: [],
        filters: { ...s.filters, repertoireId: null, title: null, color: null },
        session: initialSession(),
        board: emptyBoard(),
        analysisMode: emptyAnalysis(),
        ui: {
          ...s.ui,
          showLinesPanel: false,
          showImportPanel: false,
        },
      })
      return
    }
    const { lines, repertoires } = await loadSnapshot()
    const prev = get().filters
    let repertoireId = prev.repertoireId
    if (repertoires.length === 0) {
      repertoireId = null
    } else if (
      !repertoireId ||
      !repertoires.some((r) => r.id === repertoireId)
    ) {
      repertoireId = repertoires[0]!.id
    }
    set({
      lines,
      repertoires,
      filters: { ...prev, repertoireId },
    })
  },

  importPGN: async (pgn, repertoireName, side) => {
    if (!hasTrainerDatabase()) {
      throw new Error('Sign in to import and store repertoires.')
    }
    const result = await importRepertoireFromPgn(pgn, repertoireName, side)
    set({
      lines: result.lines,
      repertoires: result.repertoires,
      filters: { ...get().filters, repertoireId: result.repertoireId },
    })
    return {
      imported: result.imported,
      failedBlocks: result.failedBlocks,
      parsedBlocks: result.parsedBlocks,
    }
  },

  removeRepertoire: async (id) => {
    await dbDeleteRepertoire(id)
    const snap = await loadSnapshot()
    let repertoireId = get().filters.repertoireId
    if (repertoireId === id) {
      repertoireId = snap.repertoires[0]?.id ?? null
    }
    set({
      lines: snap.lines,
      repertoires: snap.repertoires,
      filters: { ...get().filters, repertoireId },
    })
  },

  upsertLinesAndRefresh: async (lines) => {
    await bulkUpsertLines(lines)
    const snap = await loadSnapshot()
    set({ lines: snap.lines, repertoires: snap.repertoires })
  },

  startSession: async () => {
    const now = new Date(get().clockNowMs || Date.now())
    const due = await getDueLines(now)
    const eligibleDue = due.filter((l) => l.srs.seen && !l.excluded)
    const { filters } = get()
    const scoped = eligibleDue.filter((l) => filterLine(l, filters, undefined))
    const queue = scoped.map((l) => l.id)
    const session: SessionState = {
      ...initialSession(),
      queue,
      total: queue.length,
      done: 0,
      status: queue.length ? 'running' : 'idle',
      userColor: 'white',
    }
    const board = emptyBoard()
    if (queue.length > 0) {
      session.currentLineId = queue[0]
      session.userColor =
        get().lines.find((l) => l.id === queue[0])?.metadata.color ?? 'white'
      set({ session, board })
      await get().resetAttempt()
      return
    }
    set({ session, board })
  },

  startRandomSession: async (opts) => {
    const now = new Date(get().clockNowMs || Date.now())
    const due = await getDueLines(now)
    const all = await getAllLines()
    const { filters } = get()
    const titleOv = opts?.title
    const dueScoped = due
      .filter((l) => !l.excluded)
      .filter((l) => filterLine(l, filters, titleOv))
    const allScoped = all
      .filter((l) => !l.excluded)
      .filter((l) => filterLine(l, filters, titleOv))
    // Random practice should feel random: pick from ALL eligible lines, not only "due".
    // We'll still prefer due lines slightly, but never restrict to them.
    const allIds = allScoped.map((l) => l.id)
    const dueIds = new Set(dueScoped.map((l) => l.id))

    // Anti-repetition: avoid recently-started lines when possible.
    const recent = get().ui.randomRecentStarts ?? []
    const recentSet = new Set(recent)
    const eligible = allIds.filter((id) => !recentSet.has(id))
    const base = eligible.length > 0 ? eligible : allIds

    // Soft preference for due: duplicate due ids once in the draw bag.
    const bag =
      dueIds.size > 0
        ? [...base, ...base.filter((id) => dueIds.has(id))]
        : base

    const startId = bag.length ? bag[randInt(bag.length)]! : null
    const rest = startId ? allIds.filter((id) => id !== startId) : allIds
    shuffleInPlace(rest)
    const queue = startId ? [startId, ...rest] : rest

    // Update recency list (keep last N).
    if (startId) {
      const MAX_RECENT = 12
      const nextRecent = [startId, ...recent.filter((x) => x !== startId)].slice(0, MAX_RECENT)
      set((s) => ({ ui: { ...s.ui, randomRecentStarts: nextRecent } }))
    }

    const session: SessionState = {
      ...initialSession(),
      queue,
      total: queue.length,
      done: 0,
      status: queue.length ? 'running' : 'idle',
      userColor: 'white',
    }
    const board = emptyBoard()
    if (queue.length > 0) {
      session.currentLineId = queue[0]!
      session.userColor =
        get().lines.find((l) => l.id === queue[0])?.metadata.color ?? 'white'
      set({ session, board })
      await get().resetAttempt()
      return
    }
    set({ session, board })
  },

  startLineSession: async (lineId) => {
    const line = get().lines.find((l) => l.id === lineId)
    if (!line) return
    get().exitAnalysisMode()
    const session: SessionState = {
      ...initialSession(),
      queue: [lineId],
      currentLineId: lineId,
      total: 1,
      done: 0,
      status: 'running',
      userColor: line.metadata.color,
    }
    set((s) => ({
      session,
      board: emptyBoard(),
      filters: {
        ...s.filters,
        repertoireId: line.repertoireId,
        title: line.metadata.title,
      },
    }))
    await get().resetAttempt()
  },

  setLineExcluded: async (lineId, excluded) => {
    const line = get().lines.find((l) => l.id === lineId)
    if (!line) return
    line.excluded = excluded
    await persistLine(line)
    set((s) => ({
      lines: s.lines.map((x) => (x.id === line.id ? { ...line } : x)),
    }))
  },

  excludeCurrentLineFromLearning: async () => {
    const cur = get().session.currentLineId
    if (!cur) return
    await get().setLineExcluded(cur, true)
    await get().next()
  },

  resetAttempt: async () => {
    const lineId = get().session.currentLineId
    if (!lineId) return
    const line = get().lines.find((l) => l.id === lineId)
    if (!line) return

    if (!line.srs.seen) {
      line.srs.seen = true
      line.srs.nextReview = new Date()
      await persistLine(line)
      set((s) => ({
        lines: s.lines.map((x) => (x.id === line.id ? { ...line } : x)),
      }))
    }

    const userColor = line.metadata.color
    const chess = new Chess(line.startFEN ?? undefined)
    let plyIndex = 0

    while (
      plyIndex < line.moves.length &&
      !isUsersTurn(userColor, plyIndex)
    ) {
      const played = chess.move(line.moves[plyIndex]!, { strict: false })
      if (!played) break
      plyIndex += 1
    }

    const history = buildTrainingLineHistory(line, userColor, plyIndex)
    const lastSnap = history[history.length - 1]!
    const chessAt = new Chess(lastSnap.fen)
    const board: BoardState = {
      chess: chessAt,
      fen: lastSnap.fen,
      hintSquares: null,
      lastOpponentMove: lastSnap.lastOpponentMove,
      history,
      historyIndex: history.length - 1,
    }
    const syncPly = lastSnap.lineMovesApplied ?? plyIndex

    set({
      board,
      session: {
        ...get().session,
        status: 'running',
        plyIndex: syncPly,
        userColor,
        overlay: null,
        attempt: { usedHint: false, madeMistake: false, correctUserPlies: 0 },
        mistakeUserPlies: [],
        remediation: null,
      },
    })
  },

  hint: () => {
    const { session, board, lines } = get()
    if (session.status !== 'running') return
    if (board.historyIndex !== board.history.length - 1) return
    const line = lines.find((l) => l.id === session.currentLineId)
    if (!line) return
    if (!isUsersTurn(session.userColor, session.plyIndex)) return
    if (session.plyIndex >= line.moves.length) return

    const expected = line.moves[session.plyIndex]!
    const probe = new Chess(board.chess.fen())
    const m = probe.move(expected, { strict: false })
    if (!m) return
    set({
      board: {
        ...board,
        hintSquares: { from: m.from, to: m.to },
      },
      session: {
        ...session,
        attempt: { ...session.attempt, usedHint: true },
      },
    })
  },

  skip: async () => {
    const { session, lines } = get()
    if (session.status !== 'running') return
    const line = lines.find((l) => l.id === session.currentLineId)
    if (!line) return

    const quality: ReviewQuality = 0
    line.stats.attempts += 1
    line.stats.lastScore = quality
    reviewLine(line, quality)
    await persistLine(line)

    set((s) => ({
      lines: s.lines.map((x) => (x.id === line.id ? { ...line } : x)),
      session: {
        ...session,
        status: 'answered',
        overlay: { type: 'skipped' },
        mistakeUserPlies: [],
        remediation: null,
      },
    }))
  },

  submitMove: (from, to, promotion) => {
    const { session, board, lines } = get()
    if (board.historyIndex !== board.history.length - 1) return
    if (session.status !== 'running') return
    const line = lines.find((l) => l.id === session.currentLineId)
    if (!line) return
    if (!isUsersTurn(session.userColor, session.plyIndex)) return
    if (session.plyIndex >= line.moves.length) return

    const expected = line.moves[session.plyIndex]!
    const test = new Chess(board.chess.fen())
    const played = test.move(
      { from, to, promotion: promotion ?? 'q' },
      { strict: false },
    )

    const nextBoardBase = { ...board, hintSquares: null }

    if (!played || played.san !== expected) {
      const mistakeUserPlies = addMistakePly(session, session.plyIndex)
      set({
        board: nextBoardBase,
        session: {
          ...session,
          // Keep the session running: user must retry until correct.
          status: 'running',
          overlay: { type: 'incorrect', expectedSAN: expected },
          attempt: { ...session.attempt, madeMistake: true },
          mistakeUserPlies,
        },
      })
      return
    }

    const beforePly = session.plyIndex
    const chess = new Chess(board.chess.fen())
    chess.move({ from, to, promotion: promotion ?? 'q' }, { strict: false })
    let plyIndex = session.plyIndex + 1
    let lastOpponentMove: LastOpponentMove = board.lastOpponentMove

    const rem = session.remediation
    if (rem && rem.queue[0] === beforePly) {
      const nextQueue = rem.queue.slice(1)
      const correctPlies = session.attempt.correctUserPlies + 1
      if (nextQueue.length === 0) {
        const end = boardStateAtLinePly(line, session.userColor, line.moves.length)
        let endBoard: BoardState
        if (end) {
          endBoard = end.board
        } else {
          let c = chess
          let pi = beforePly + 1
          let lom: LastOpponentMove = lastOpponentMove
          const tail: BoardSnapshot[] = []
          while (pi < line.moves.length) {
            const om = c.move(line.moves[pi]!, { strict: false })
            if (!om) break
            if (!isUsersTurn(session.userColor, pi)) {
              lom = { from: om.from, to: om.to, san: om.san }
            }
            pi += 1
            tail.push({ fen: c.fen(), lastOpponentMove: lom, lineMovesApplied: pi })
          }
          endBoard = {
            ...nextBoardBase,
            chess: c,
            fen: c.fen(),
            lastOpponentMove: lom,
            history: [...board.history, ...tail],
            historyIndex: board.history.length + tail.length - 1,
          }
        }
        const quality = computeQualitySuccess({
          ...session.attempt,
          correctUserPlies: correctPlies,
        })
        line.stats.attempts += 1
        line.stats.lastScore = quality
        if (quality >= 3) line.stats.successes += 1
        reviewLine(line, quality)
        void persistLine(line)
        set((s) => ({
          lines: s.lines.map((x) => (x.id === line.id ? { ...line } : x)),
          board: endBoard,
          session: {
            ...session,
            plyIndex: line.moves.length,
            status: 'answered',
            overlay: { type: 'correct' },
            remediation: null,
            mistakeUserPlies: [],
            attempt: {
              ...session.attempt,
              correctUserPlies: correctPlies,
            },
          },
        }))
        return
      }
      let nextPly = nextQueue[0]!
      let restQ = nextQueue
      let atNext =
        boardStateFromSnapshotsAtApplied(nextBoardBase, rem.history, nextPly) ??
        boardStateAtLinePly(line, session.userColor, nextPly)?.board ??
        null
      while (!atNext && restQ.length > 1) {
        restQ = restQ.slice(1)
        nextPly = restQ[0]!
        atNext =
          boardStateFromSnapshotsAtApplied(nextBoardBase, rem.history, nextPly) ??
          boardStateAtLinePly(line, session.userColor, nextPly)?.board ??
          null
      }
      if (!atNext) return
      set({
        board: atNext,
        session: {
          ...session,
          plyIndex: nextPly,
          remediation: { queue: restQ, history: rem.history },
          status: 'running',
          overlay: null,
          attempt: {
            ...session.attempt,
            correctUserPlies: correctPlies,
          },
        },
      })
      return
    }

    const snaps: BoardSnapshot[] = [
      {
        fen: chess.fen(),
        lastOpponentMove,
        lineMovesApplied: plyIndex,
      },
    ]

    while (plyIndex < line.moves.length && !isUsersTurn(session.userColor, plyIndex)) {
      const om = chess.move(line.moves[plyIndex]!, { strict: false })
      if (!om) break
      lastOpponentMove = { from: om.from, to: om.to, san: om.san }
      plyIndex += 1
      snaps.push({
        fen: chess.fen(),
        lastOpponentMove,
        lineMovesApplied: plyIndex,
      })
    }

    const fen = chess.fen()

    if (plyIndex >= line.moves.length) {
      const live = get().session
      const mistakes = collectMistakePlies(live, line)
      if (mistakes.length > 0 && !live.remediation) {
        const firstPly = mistakes[0]!
        const fullBoard: BoardState = {
          ...nextBoardBase,
          chess,
          fen,
          lastOpponentMove,
          history: [...board.history, ...snaps],
          historyIndex: board.history.length + snaps.length - 1,
        }
        const atFirst =
          boardStateFromHistoryAtApplied(fullBoard, firstPly) ??
          boardStateAtLinePly(line, live.userColor, firstPly)?.board ??
          null
        const correctPlies = live.attempt.correctUserPlies + 1
        if (atFirst) {
          set({
            board: atFirst,
            session: {
              ...live,
              plyIndex: firstPly,
              status: 'running',
              overlay: null,
              remediation: { queue: mistakes, history: fullBoard.history },
              mistakeUserPlies: [],
              attempt: {
                ...live.attempt,
                correctUserPlies: correctPlies,
              },
            },
          })
          return
        }
      }

      const quality = computeQualitySuccess({
        ...session.attempt,
        correctUserPlies: session.attempt.correctUserPlies + 1,
      })
      line.stats.attempts += 1
      line.stats.lastScore = quality
      if (quality >= 3) line.stats.successes += 1
      reviewLine(line, quality)
      void persistLine(line)
      set((s) => ({
        lines: s.lines.map((x) => (x.id === line.id ? { ...line } : x)),
        board: {
          ...nextBoardBase,
          chess,
          fen,
          lastOpponentMove,
          history: [...board.history, ...snaps],
          historyIndex: board.history.length + snaps.length - 1,
        },
        session: {
          ...session,
          plyIndex,
          status: 'answered',
          overlay: { type: 'correct' },
          remediation: null,
          mistakeUserPlies: [],
          attempt: {
            ...session.attempt,
            correctUserPlies: session.attempt.correctUserPlies + 1,
          },
        },
      }))
      return
    }

    set({
      board: {
        ...nextBoardBase,
        chess,
        fen,
        lastOpponentMove,
        history: [...board.history, ...snaps],
        historyIndex: board.history.length + snaps.length - 1,
      },
      session: {
        ...session,
        plyIndex,
        overlay: null,
        attempt: {
          ...session.attempt,
          correctUserPlies: session.attempt.correctUserPlies + 1,
        },
      },
    })
  },

  continueAfterMistake: () => {
    const { session, board, lines } = get()
    if (session.overlay?.type !== 'incorrect') return
    if (board.historyIndex !== board.history.length - 1) return
    const line = lines.find((l) => l.id === session.currentLineId)
    if (!line) return
    const expected = session.overlay.expectedSAN

    const chess = new Chess(board.chess.fen())
    const um = chess.move(expected, { strict: false })
    if (!um) return
    let plyIndex = session.plyIndex + 1
    let lastOpponentMove: LastOpponentMove = board.lastOpponentMove

    const snaps: BoardSnapshot[] = [
      {
        fen: chess.fen(),
        lastOpponentMove,
        lineMovesApplied: plyIndex,
      },
    ]

    while (plyIndex < line.moves.length && !isUsersTurn(session.userColor, plyIndex)) {
      const om = chess.move(line.moves[plyIndex]!, { strict: false })
      if (!om) break
      lastOpponentMove = { from: om.from, to: om.to, san: om.san }
      plyIndex += 1
      snaps.push({
        fen: chess.fen(),
        lastOpponentMove,
        lineMovesApplied: plyIndex,
      })
    }

    const fen = chess.fen()

    set({
      board: {
        ...board,
        chess,
        fen,
        lastOpponentMove,
        hintSquares: null,
        history: [...board.history, ...snaps],
        historyIndex: board.history.length + snaps.length - 1,
      },
      session: {
        ...session,
        plyIndex,
        status: 'running',
        overlay: null,
        attempt: {
          ...session.attempt,
          correctUserPlies: session.attempt.correctUserPlies + 1,
        },
      },
    })
  },

  next: async () => {
    const { session } = get()
    const idx = session.queue.indexOf(session.currentLineId ?? '')
    const nextId = session.queue[idx + 1]
    const done = Math.min(session.total, session.done + 1)
    if (!nextId) {
      set({
        session: { ...initialSession(), done, total: session.total },
        board: emptyBoard(),
      })
      return
    }
    set({
      session: {
        ...session,
        currentLineId: nextId,
        done,
        userColor:
          get().lines.find((l) => l.id === nextId)?.metadata.color ?? 'white',
      },
      board: emptyBoard(),
    })
    await get().resetAttempt()
  },

  endSession: () => {
    set({ session: initialSession(), board: emptyBoard() })
  },

  navPrev: () => {
    const { board } = get()
    if (board.historyIndex <= 0) return
    const i = board.historyIndex - 1
    const snap = board.history[i]!
    const chess = new Chess(snap.fen)
    set({
      board: {
        ...board,
        chess,
        fen: snap.fen,
        lastOpponentMove: snap.lastOpponentMove,
        historyIndex: i,
        hintSquares: null,
      },
    })
  },

  navNext: () => {
    const { board } = get()
    if (board.historyIndex >= board.history.length - 1) return
    const i = board.historyIndex + 1
    const snap = board.history[i]!
    const chess = new Chess(snap.fen)
    set({
      board: {
        ...board,
        chess,
        fen: snap.fen,
        lastOpponentMove: snap.lastOpponentMove,
        historyIndex: i,
        hintSquares: null,
      },
    })
  },

  navToEnd: () => {
    const { board } = get()
    if (board.history.length === 0) return
    const i = board.history.length - 1
    const snap = board.history[i]!
    const chess = new Chess(snap.fen)
    set({
      board: {
        ...board,
        chess,
        fen: snap.fen,
        lastOpponentMove: snap.lastOpponentMove,
        historyIndex: i,
        hintSquares: null,
      },
    })
  },

  enterAnalysisMode: () => {
    const fen = get().board.fen
    const chess = new Chess(fen)
    const multiPv: AnalysisMultiPv = 2
    const targetDepth = clampAnalysisTargetDepth(ANALYSIS_DEPTH_DEFAULT)
    set({
      analysisMode: {
        enabled: true,
        chess,
        fen,
        history: [{ fen }],
        historyIndex: 0,
        depth: 0,
        lines: [],
        analyzing: true,
        multiPv,
        targetDepth,
      },
    })
    runStockfishJob(fen, set, multiPv, targetDepth)
  },

  setAnalysisMultiPv: (multiPv) => {
    const am = get().analysisMode
    if (!am.enabled) return
    if (am.multiPv === multiPv) return
    const targetDepth = clampAnalysisTargetDepth(am.targetDepth)
    set({
      analysisMode: {
        ...am,
        multiPv,
        lines: [],
        depth: 0,
        analyzing: true,
        targetDepth,
      },
    })
    runStockfishJob(am.fen, set, multiPv, targetDepth)
  },

  setAnalysisTargetDepth: (rawDepth) => {
    const am = get().analysisMode
    if (!am.enabled) return
    const targetDepth = clampAnalysisTargetDepth(rawDepth)
    if (targetDepth === am.targetDepth) return
    set({
      analysisMode: {
        ...am,
        targetDepth,
        lines: [],
        depth: 0,
        analyzing: true,
      },
    })
    runStockfishJob(am.fen, set, am.multiPv, targetDepth)
  },

  exitAnalysisMode: () => {
    analysisJobId += 1
    set({ analysisMode: emptyAnalysis() })
  },

  analysisMove: (from, to, promotion) => {
    const am = get().analysisMode
    if (!am.enabled) return
    const chess = new Chess(am.fen)
    const m = chess.move(
      { from, to, promotion: promotion ?? 'q' },
      { strict: false },
    )
    if (!m) return
    const fen = chess.fen()
    const hist = am.history.slice(0, am.historyIndex + 1)
    hist.push({ fen })
    set({
      analysisMode: {
        ...am,
        chess,
        fen,
        history: hist,
        historyIndex: hist.length - 1,
        depth: 0,
        lines: [],
        analyzing: true,
      },
    })
    runStockfishJob(fen, set, am.multiPv, am.targetDepth)
  },

  analysisPrev: () => {
    const am = get().analysisMode
    if (!am.enabled || am.historyIndex <= 0) return
    const i = am.historyIndex - 1
    const fen = am.history[i]!.fen
    const chess = new Chess(fen)
    set({
      analysisMode: {
        ...am,
        chess,
        fen,
        historyIndex: i,
        depth: 0,
        lines: [],
        analyzing: true,
      },
    })
    runStockfishJob(fen, set, am.multiPv, am.targetDepth)
  },

  analysisNext: () => {
    const am = get().analysisMode
    if (!am.enabled || am.historyIndex >= am.history.length - 1) return
    const i = am.historyIndex + 1
    const fen = am.history[i]!.fen
    const chess = new Chess(fen)
    set({
      analysisMode: {
        ...am,
        chess,
        fen,
        historyIndex: i,
        depth: 0,
        lines: [],
        analyzing: true,
      },
    })
    runStockfishJob(fen, set, am.multiPv, am.targetDepth)
  },

  analysisNavToStart: () => {
    const am = get().analysisMode
    if (!am.enabled || am.historyIndex <= 0) return
    const i = 0
    const fen = am.history[i]!.fen
    const chess = new Chess(fen)
    set({
      analysisMode: {
        ...am,
        chess,
        fen,
        historyIndex: i,
        depth: 0,
        lines: [],
        analyzing: true,
      },
    })
    runStockfishJob(fen, set, am.multiPv, am.targetDepth)
  },

  analysisNavToEnd: () => {
    const am = get().analysisMode
    if (!am.enabled || am.history.length === 0) return
    const i = am.history.length - 1
    if (am.historyIndex === i) return
    const fen = am.history[i]!.fen
    const chess = new Chess(fen)
    set({
      analysisMode: {
        ...am,
        chess,
        fen,
        historyIndex: i,
        depth: 0,
        lines: [],
        analyzing: true,
      },
    })
    runStockfishJob(fen, set, am.multiPv, am.targetDepth)
  },
}))
