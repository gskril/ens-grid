import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ensNames } from './names'
import { AvatarCell } from './AvatarCell'

const AVATAR_SIZE = 80
const GAP = 8
const CELL_SIZE = AVATAR_SIZE + GAP

function getNameForCell(col: number, row: number): string {
  const index = Math.abs((col * 7919 + row * 104729) % ensNames.length)
  return ensNames[index]
}

export interface CellInfo {
  key: string
  name: string
  x: number
  y: number
}

export function Grid() {
  const [viewport, setViewport] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  })
  const navigate = useNavigate()

  const dragState = useRef({
    isDragging: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  })

  useEffect(() => {
    const onResize = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const cells = useMemo<CellInfo[]>(() => {
    const cols = Math.ceil(size.w / CELL_SIZE) + 2
    const rows = Math.ceil(size.h / CELL_SIZE) + 2
    const startCol = Math.floor(viewport.x / CELL_SIZE)
    const startRow = Math.floor(viewport.y / CELL_SIZE)
    const offsetX = -(((viewport.x % CELL_SIZE) + CELL_SIZE) % CELL_SIZE)
    const offsetY = -(((viewport.y % CELL_SIZE) + CELL_SIZE) % CELL_SIZE)

    const out: CellInfo[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const col = startCol + c
        const row = startRow + r
        out.push({
          key: `${col},${row}`,
          name: getNameForCell(col, row),
          x: offsetX + c * CELL_SIZE,
          y: offsetY + r * CELL_SIZE,
        })
      }
    }
    return out
  }, [viewport, size])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    dragState.current = {
      isDragging: true,
      hasMoved: false,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current
    if (!ds.isDragging) return
    const dx = e.clientX - ds.lastX
    const dy = e.clientY - ds.lastY
    if (
      Math.abs(e.clientX - ds.startX) > 5 ||
      Math.abs(e.clientY - ds.startY) > 5
    ) {
      ds.hasMoved = true
    }
    ds.lastX = e.clientX
    ds.lastY = e.clientY
    setViewport((v) => ({ x: v.x - dx, y: v.y - dy }))
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragState.current.isDragging = false
    const el = e.currentTarget as HTMLElement
    if (el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId)
    }
  }, [])

  const onCellClick = useCallback(
    (name: string) => {
      if (dragState.current.hasMoved) return
      navigate({ to: '/$name', params: { name } })
    },
    [navigate],
  )

  return (
    <div
      id="grid-container"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {cells.map((cell) => (
        <AvatarCell key={cell.key} cell={cell} onClick={onCellClick} />
      ))}
    </div>
  )
}
