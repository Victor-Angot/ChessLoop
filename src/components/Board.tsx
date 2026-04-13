import { useCallback, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { Chessboard, ChessboardProvider } from 'react-chessboard'
import type { Arrow } from 'react-chessboard'

const amber = 'rgba(245, 180, 60, 0.38)'
const green = 'rgba(40, 200, 120, 0.42)'
const redBrown = 'rgba(120, 45, 35, 0.42)'
const wrongArrow = 'rgba(150, 40, 20, 0.78)'

export function Board({
  fen,
  boardOrientation,
  allowDrag,
  onUserMove,
  lastOpponentMove,
  hintSquares,
  incorrectExpected,
  customArrows,
  boardWrapperClassName,
}: {
  fen: string
  boardOrientation: 'white' | 'black'
  allowDrag: boolean
  onUserMove: (from: string, to: string, promotion?: string) => void
  lastOpponentMove: { from: string; to: string } | null
  hintSquares: { from: string; to: string } | null
  incorrectExpected: { from: string; to: string } | null
  customArrows?: Arrow[]
  /** Override default max width (e.g. larger home / free-play board). */
  boardWrapperClassName?: string
}) {
  const [selected, setSelected] = useState<Square | null>(null)

  const game = useMemo(() => new Chess(fen), [fen])

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}
    if (lastOpponentMove) {
      styles[lastOpponentMove.from] = { backgroundColor: amber }
      styles[lastOpponentMove.to] = { backgroundColor: amber }
    }
    if (hintSquares) {
      styles[hintSquares.from] = { backgroundColor: green }
      styles[hintSquares.to] = { backgroundColor: green }
    }
    if (incorrectExpected) {
      styles[incorrectExpected.from] = { backgroundColor: redBrown }
      styles[incorrectExpected.to] = { backgroundColor: redBrown }
    }
    if (selected) {
      const moves = game.moves({ square: selected, verbose: true })
      for (const m of moves) {
        styles[m.to] = {
          ...styles[m.to],
          boxShadow: 'inset 0 0 0 2px rgba(91,140,255,0.55)',
        }
      }
      styles[selected] = {
        ...styles[selected],
        boxShadow: 'inset 0 0 0 2px rgba(91,140,255,0.85)',
      }
    }
    return styles
  }, [lastOpponentMove, hintSquares, incorrectExpected, selected, game])

  const arrows = useMemo((): Arrow[] => {
    const base: Arrow[] = customArrows ? [...customArrows] : []
    if (incorrectExpected) {
      base.push({
        startSquare: incorrectExpected.from,
        endSquare: incorrectExpected.to,
        color: wrongArrow,
      })
    }
    return base
  }, [customArrows, incorrectExpected])

  const handleSquareClick = useCallback(
    ({ square }: { piece: unknown; square: string }) => {
      if (!allowDrag) return
      const sq = square as Square
      if (!selected) {
        const piece = game.get(sq)
        if (!piece) return
        const moves = game.moves({ square: sq, verbose: true })
        if (moves.length === 0) return
        setSelected(sq)
        return
      }
      if (selected === sq) {
        setSelected(null)
        return
      }
      const legal = game.moves({
        square: selected,
        verbose: true,
      })
      if (!legal.some((m) => m.to === sq)) {
        setSelected(null)
        return
      }
      const isPromo = legal.some((m) => m.to === sq && m.promotion != null)
      onUserMove(selected, sq, isPromo ? 'q' : undefined)
      setSelected(null)
    },
    [allowDrag, onUserMove, selected, game],
  )

  return (
    <div
      className={clsx(
        'mx-auto',
        boardWrapperClassName ?? 'w-full max-w-[520px] lg:max-w-[640px]',
      )}
    >
      <ChessboardProvider
        options={{
          id: 'main-board',
          position: fen,
          boardOrientation,
          allowDragging: allowDrag,
          animationDurationInMs: 150,
          squareStyles,
          arrows,
          onSquareClick: handleSquareClick,
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!allowDrag || !targetSquare) return false
            const moves = game.moves({ square: sourceSquare as Square, verbose: true })
            const match = moves.find((m) => m.to === targetSquare)
            if (!match) return false
            onUserMove(
              sourceSquare,
              targetSquare,
              match.promotion ? 'q' : undefined,
            )
            setSelected(null)
            return true
          },
        }}
      >
        <Chessboard />
      </ChessboardProvider>
    </div>
  )
}
