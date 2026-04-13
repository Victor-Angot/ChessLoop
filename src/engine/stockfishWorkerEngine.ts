import type { AnalysisSnapshot, IEngineAnalyzer } from './stockfishEngineTypes'
import { parseBestMove, parseInfoLines } from './parseUci'

function workerScriptUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}sf/stockfish-worker.js`
}

type LineWaiter = {
  acc: string[]
  done: (lines: string[]) => void
  until: (line: string) => boolean
}

/**
 * UCI over a Stockfish.js worker (`/public/sf/stockfish-worker.js`).
 * ASM build avoids WASM fetch / worker issues with Vite (same setup as Problems/).
 */
export class StockfishWorkerEngine implements IEngineAnalyzer {
  private worker: Worker | null = null
  private chain: Promise<void> = Promise.resolve()
  private currentWaiter: LineWaiter | null = null

  init(): Promise<void> {
    if (this.worker) return Promise.resolve()
    return new Promise((resolve, reject) => {
      try {
        const url = workerScriptUrl()
        const w = new Worker(url, { type: 'classic' })
        this.worker = w

        const pushEngineLines = (raw: string) => {
          const segments = raw.split(/\r?\n/)
          for (const segment of segments) {
            const line = segment.trimEnd()
            if (!line.trim()) continue
            const waiter = this.currentWaiter
            if (waiter) {
              waiter.acc.push(line)
              if (waiter.until(line)) {
                this.currentWaiter = null
                waiter.done([...waiter.acc])
              }
            }
          }
        }

        w.onmessage = (ev: MessageEvent<unknown>) => {
          pushEngineLines(String(ev.data))
        }
        w.onerror = (e) => {
          reject(
            new Error(
              e.message ||
                'Stockfish worker failed to load (check /sf/stockfish-worker.js).',
            ),
          )
        }

        const handshake = this.enqueue(async () => {
          await this.runUntil((l) => l.trim() === 'uciok', 'uci')
          await this.runUntil((l) => l.trim() === 'readyok', 'isready')
        })

        const timeoutMs = 25_000
        const timeout = new Promise<never>((_, rej) =>
          setTimeout(
            () =>
              rej(
                new Error(
                  `Stockfish handshake timed out after ${timeoutMs / 1000}s (worker URL: ${url})`,
                ),
              ),
            timeoutMs,
          ),
        )

        void Promise.race([handshake, timeout])
          .then(() => resolve())
          .catch(reject)
      } catch (e) {
        reject(e)
      }
    })
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn)
    this.chain = run.then(
      () => {},
      () => {},
    )
    return run
  }

  private runUntil(until: (line: string) => boolean, cmd: string): Promise<string[]> {
    const w = this.worker
    if (!w) return Promise.reject(new Error('Engine not initialized'))

    return new Promise((resolve) => {
      this.currentWaiter = { acc: [], done: resolve, until }
      w.postMessage(cmd)
    })
  }

  analyze(
    fen: string,
    depth: number,
    multipv: number,
    movetimeMs?: number,
  ): Promise<AnalysisSnapshot> {
    return this.enqueue(() => this.doAnalyze(fen, depth, multipv, movetimeMs))
  }

  private async doAnalyze(
    fen: string,
    depth: number,
    multipv: number,
    movetimeMs?: number,
  ): Promise<AnalysisSnapshot> {
    const w = this.worker
    if (!w) throw new Error('Engine not initialized')

    w.postMessage(`setoption name MultiPV value ${multipv}`)
    w.postMessage(`position fen ${fen}`)

    const goCmd =
      movetimeMs != null && movetimeMs > 0
        ? `go depth ${depth} movetime ${Math.round(movetimeMs)}`
        : `go depth ${depth}`

    const lines = await new Promise<string[]>((resolve) => {
      this.currentWaiter = {
        acc: [],
        done: resolve,
        until: (line) => line.trim().startsWith('bestmove'),
      }
      w.postMessage(goCmd)
    })

    const bestFromLine = lines.map((l) => parseBestMove(l)).find(Boolean) ?? null
    const parsed = parseInfoLines(lines)
    const bestMoveUci = bestFromLine ?? parsed[0]?.pvUci[0] ?? ''

    return {
      fen,
      lines: parsed,
      bestMoveUci,
    }
  }

  dispose(): void {
    try {
      this.worker?.postMessage('quit')
    } catch {
      /* ignore */
    }
    this.worker?.terminate()
    this.worker = null
    this.currentWaiter = null
    this.chain = Promise.resolve()
  }
}
