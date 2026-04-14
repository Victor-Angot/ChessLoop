import { StockfishWorkerEngine } from './stockfishWorkerEngine'

let engine: StockfishWorkerEngine | null = null
let ready: Promise<StockfishWorkerEngine> | null = null

/** Shared engine for analysis (same lifecycle pattern as Problems/PuzzleApp). */
export function ensureStockfishEngine(): Promise<StockfishWorkerEngine> {
  if (engine) return Promise.resolve(engine)
  if (!ready) {
    ready = (async () => {
      const e = new StockfishWorkerEngine()
      await e.init()
      engine = e
      return e
    })().catch((err) => {
      ready = null
      throw err
    })
  }
  return ready
}
