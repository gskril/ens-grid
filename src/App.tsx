import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ensNames } from './names'
import { getAvatarUrl, type Profile, fetchProfile } from './api'
import { ProfileModal } from './ProfileModal'

const AVATAR_SIZE = 80
const GAP = 8
const CELL_SIZE = AVATAR_SIZE + GAP

function getNameForCell(col: number, row: number): string {
  const index = Math.abs((col * 7919 + row * 104729) % ensNames.length)
  return ensNames[index]
}

interface CellInfo {
  key: string
  col: number
  row: number
  name: string
  x: number
  y: number
}

export function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  })
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)

  const dragState = useRef({
    isDragging: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  })

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const cells = useMemo<CellInfo[]>(() => {
    const cols = Math.ceil(size.w / CELL_SIZE) + 2
    const rows = Math.ceil(size.h / CELL_SIZE) + 2
    const startCol = Math.floor(viewport.x / CELL_SIZE)
    const startRow = Math.floor(viewport.y / CELL_SIZE)
    const offsetX = -((viewport.x % CELL_SIZE + CELL_SIZE) % CELL_SIZE)
    const offsetY = -((viewport.y % CELL_SIZE + CELL_SIZE) % CELL_SIZE)

    const out: CellInfo[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const col = startCol + c
        const row = startRow + r
        out.push({
          key: `${col},${row}`,
          col,
          row,
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
    const ds = dragState.current
    ds.isDragging = false
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    }
  }, [])

  const onCellClick = useCallback(async (name: string) => {
    if (dragState.current.hasMoved) return
    setSelectedName(name)
    setSelectedProfile(null)
    const profile = await fetchProfile(name)
    setSelectedName((current) => {
      if (current === name) setSelectedProfile(profile)
      return current
    })
  }, [])

  const closeModal = useCallback(() => {
    setSelectedName(null)
    setSelectedProfile(null)
  }, [])

  return (
    <>
      <div
        id="grid-container"
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {cells.map((cell) => (
          <AvatarCell key={cell.key} cell={cell} onClick={onCellClick} />
        ))}
      </div>
      {selectedName && (
        <ProfileModal
          name={selectedName}
          profile={selectedProfile}
          onClose={closeModal}
        />
      )}
    </>
  )
}

interface AvatarCellProps {
  cell: CellInfo
  onClick: (name: string) => void
}

function AvatarCell({ cell, onClick }: AvatarCellProps) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className={`avatar-cell${failed ? ' no-avatar' : ''}`}
      style={{ transform: `translate(${cell.x}px, ${cell.y}px)` }}
      onClick={() => onClick(cell.name)}
      title={cell.name}
    >
      {!failed && (
        <img
          src={getAvatarUrl(cell.name)}
          alt={cell.name}
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
