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

interface Size {
  w: number
  h: number
}

interface Viewport {
  x: number
  y: number
}

interface GridWindow {
  cols: number
  rows: number
  startCol: number
  startRow: number
}

function getSize(): Size {
  return {
    w: typeof window !== 'undefined' ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  }
}

function getGridWindow(viewport: Viewport, size: Size): GridWindow {
  return {
    cols: Math.ceil(size.w / CELL_SIZE) + 2,
    rows: Math.ceil(size.h / CELL_SIZE) + 2,
    startCol: Math.floor(viewport.x / CELL_SIZE),
    startRow: Math.floor(viewport.y / CELL_SIZE),
  }
}

function getLayerOffset(viewport: Viewport): { x: number; y: number } {
  return {
    x: -(((viewport.x % CELL_SIZE) + CELL_SIZE) % CELL_SIZE),
    y: -(((viewport.y % CELL_SIZE) + CELL_SIZE) % CELL_SIZE),
  }
}

function sameGridWindow(a: GridWindow, b: GridWindow): boolean {
  return (
    a.cols === b.cols &&
    a.rows === b.rows &&
    a.startCol === b.startCol &&
    a.startRow === b.startRow
  )
}

export function Grid() {
  const viewportRef = useRef<Viewport>({ x: 0, y: 0 })
  const sizeRef = useRef<Size>(getSize())
  const layerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const gridWindowRef = useRef<GridWindow>(
    getGridWindow(viewportRef.current, sizeRef.current),
  )
  const [gridWindow, setGridWindow] = useState(gridWindowRef.current)
  const navigate = useNavigate()

  const dragState = useRef({
    isDragging: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  })

  const applyViewport = useCallback(() => {
    frameRef.current = null

    const offset = getLayerOffset(viewportRef.current)
    if (layerRef.current) {
      layerRef.current.style.transform = `translate3d(${offset.x}px, ${offset.y}px, 0)`
    }

    const nextGridWindow = getGridWindow(viewportRef.current, sizeRef.current)
    if (!sameGridWindow(gridWindowRef.current, nextGridWindow)) {
      gridWindowRef.current = nextGridWindow
      setGridWindow(nextGridWindow)
    }
  }, [])

  const scheduleViewportApply = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(applyViewport)
  }, [applyViewport])

  useEffect(() => {
    const onResize = () => {
      sizeRef.current = getSize()
      scheduleViewportApply()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [scheduleViewportApply])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
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
      viewportRef.current = {
        x: viewportRef.current.x - dx,
        y: viewportRef.current.y - dy,
      }
      scheduleViewportApply()
    }
    const onUp = () => {
      dragState.current.isDragging = false
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [scheduleViewportApply])

  const cells = useMemo<CellInfo[]>(() => {
    const out: CellInfo[] = []
    for (let r = 0; r < gridWindow.rows; r++) {
      for (let c = 0; c < gridWindow.cols; c++) {
        const col = gridWindow.startCol + c
        const row = gridWindow.startRow + r
        out.push({
          key: `${col},${row}`,
          name: getNameForCell(col, row),
          x: c * CELL_SIZE,
          y: r * CELL_SIZE,
        })
      }
    }
    return out
  }, [gridWindow])

  useEffect(() => {
    applyViewport()
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [applyViewport])

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
  }, [])

  const onCellClick = useCallback(
    (name: string) => {
      if (dragState.current.hasMoved) return
      navigate({ to: '/$name', params: { name } })
    },
    [navigate],
  )

  return (
    <div id="grid-container" onPointerDown={onPointerDown}>
      <div id="grid-layer" ref={layerRef}>
        {cells.map((cell) => (
          <AvatarCell key={cell.key} cell={cell} onClick={onCellClick} />
        ))}
      </div>
    </div>
  )
}
