import type { EngineLine, EngineScore } from './stockfishEngineTypes'

function parseScore(line: string): EngineScore | null {
  const mate = /\bscore mate (-?\d+)\b/.exec(line)
  if (mate) return { kind: 'mate', plies: parseInt(mate[1], 10) }
  const cp = /\bscore cp (-?\d+)\b/.exec(line)
  if (cp) return { kind: 'cp', cp: parseInt(cp[1], 10) }
  return null
}

/**
 * Keeps the strongest info line per MultiPV index (by depth, then last wins).
 */
export function parseInfoLines(lines: string[]): EngineLine[] {
  const byMp = new Map<number, EngineLine>()

  for (const raw of lines) {
    if (!raw.startsWith('info ') || !raw.includes(' pv ')) continue
    const dep = /\bdepth (\d+)\b/.exec(raw)
    const mp = /\bmultipv (\d+)\b/.exec(raw)
    const pvRaw = /\bpv (.+)$/.exec(raw)
    if (!pvRaw) continue

    const multipv = mp ? parseInt(mp[1], 10) : 1
    const depth = dep ? parseInt(dep[1], 10) : 0
    const pvUci = pvRaw[1]
      .trim()
      .split(/\s+/)
      .filter((m) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m))
    if (pvUci.length === 0) continue

    const score = parseScore(raw)
    const prev = byMp.get(multipv)
    if (!prev || depth >= prev.depth) {
      byMp.set(multipv, { multipv, depth, score, pvUci })
    }
  }

  return [...byMp.values()].sort((a, b) => a.multipv - b.multipv)
}

export function parseBestMove(line: string): string | null {
  const t = line.trim()
  if (!t.startsWith('bestmove')) return null
  const tok = t.split(/\s+/)
  if (tok[1] === '(none)') return null
  return tok[1] ?? null
}
