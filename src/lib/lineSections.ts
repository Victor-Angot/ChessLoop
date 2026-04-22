import type { ChessLine } from '../types/chess.types'

/** Groups lines that share the same repertoire and opening title (one PGN “section”). */
export function lineSectionKey(line: ChessLine): string {
  return `${line.repertoireId}\x1e${line.metadata.title}`
}

export function sortLinesWithinSection(a: ChessLine, b: ChessLine): number {
  const sa = (a.metadata.subtitle || '').trim() || a.id
  const sb = (b.metadata.subtitle || '').trim() || b.id
  const c = sa.localeCompare(sb, undefined, { sensitivity: 'base' })
  if (c !== 0) return c
  return a.id.localeCompare(b.id)
}

export function linesInSameSection(allLines: ChessLine[], line: ChessLine): ChessLine[] {
  const key = lineSectionKey(line)
  return allLines
    .filter((l) => lineSectionKey(l) === key)
    .sort(sortLinesWithinSection)
}

/** 1-based variation index among all lines in that section (stable across filters). */
export function variationNumberInSection(
  allLines: ChessLine[],
  line: ChessLine,
): { index: number; total: number } {
  const g = linesInSameSection(allLines, line)
  const idx = g.findIndex((l) => l.id === line.id)
  return { index: idx >= 0 ? idx + 1 : 1, total: Math.max(1, g.length) }
}

export type LineSectionGroup = {
  key: string
  title: string
  repertoireId: string
  lines: ChessLine[]
}

/** Build ordered sections from a line list (e.g. filtered library lines). */
export function groupLinesIntoSections(lines: ChessLine[]): LineSectionGroup[] {
  const map = new Map<string, ChessLine[]>()
  for (const l of lines) {
    const k = lineSectionKey(l)
    const arr = map.get(k)
    if (arr) arr.push(l)
    else map.set(k, [l])
  }
  const out: LineSectionGroup[] = []
  for (const [key, groupLines] of map) {
    groupLines.sort(sortLinesWithinSection)
    const first = groupLines[0]!
    out.push({
      key,
      title: first.metadata.title,
      repertoireId: first.repertoireId,
      lines: groupLines,
    })
  }
  out.sort((a, b) => {
    const t = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    if (t !== 0) return t
    return a.repertoireId.localeCompare(b.repertoireId)
  })
  return out
}
