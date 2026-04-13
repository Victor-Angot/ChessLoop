import { useCallback, useState } from 'react'
import { X } from 'lucide-react'
import type { TrainerColor } from '../types/chess.types'
import { useChessStore } from '../stores/useChessStore'
import { Notice } from './ui/Notice'

export function PGNImporter() {
  const importPGN = useChessStore((s) => s.importPGN)
  const setImportPanelOpen = useChessStore((s) => s.setImportPanelOpen)
  const [name, setName] = useState('')
  const [side, setSide] = useState<TrainerColor>('black')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<
    { type: 'ok' | 'err'; text: string } | null
  >(null)

  const runImport = useCallback(
    async (body: string, repName: string) => {
      setBusy(true)
      setMsg(null)
      try {
        const r = await importPGN(body, repName, side)
        setMsg({
          type: 'ok',
          text: `Imported ${r.imported} line(s). Parsed blocks: ${r.parsedBlocks}, failed: ${r.failedBlocks}.`,
        })
        setText('')
      } catch (e) {
        setMsg({
          type: 'err',
          text: e instanceof Error ? e.message : 'Import failed.',
        })
      } finally {
        setBusy(false)
      }
    },
    [importPGN, side],
  )

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void runImport(text, name.trim() || 'New repertoire')
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (!f) return
    const base = f.name.replace(/\.pgn$/i, '')
    setName((n) => n || base)
    void f.text().then((t) => setText(t))
  }

  return (
    <section className="card max-h-[min(85vh,52rem)] overflow-y-auto shadow-[var(--shadow-md)]">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Import PGN
        </h2>
        <button
          type="button"
          className="btn btn-icon btn-ghost text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="Close import"
          onClick={() => setImportPanelOpen(false)}
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </header>
      <form className="panel space-y-4" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">Repertoire name</span>
          <input
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Sicilian"
          />
        </label>
        <label className="field">
          <span className="label">Your side</span>
          <select
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm"
            value={side}
            onChange={(e) => setSide(e.target.value as TrainerColor)}
          >
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </label>
        <label className="field">
          <span className="label">PGN text</span>
          <textarea
            className="min-h-[180px] rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 font-mono text-xs"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            placeholder="Paste PGN or drop a .pgn file…"
          />
        </label>
        {msg ? (
          <Notice variant={msg.type === 'ok' ? 'success' : 'error'}>
            {msg.text}
          </Notice>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
          {busy ? 'Importing…' : 'Import'}
        </button>
      </form>
    </section>
  )
}
