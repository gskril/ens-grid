import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import { animate, spring, type AnimationPlaybackControls } from 'motion'
import { ensNames } from './names'
import { AvatarCell } from './AvatarCell'

const AVATAR_SIZE = 80
const GAP = 8
const CELL_SIZE = AVATAR_SIZE + GAP
const VELOCITY_SMOOTHING = 0.35
const RELEASE_PROJECTION_MS = 260
const MAX_RELEASE_SPEED = 0.7
const MAX_RELEASE_DISTANCE = CELL_SIZE * 2
const RELEASE_SPRING = {
  type: spring,
  stiffness: 320,
  damping: 46,
  mass: 1,
  restDelta: 0.5,
  restSpeed: 12,
}

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
    x: -viewport.x,
    y: -viewport.y,
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

function getSettledViewport(viewport: Viewport): Viewport {
  return {
    x: Math.round(viewport.x / CELL_SIZE) * CELL_SIZE,
    y: Math.round(viewport.y / CELL_SIZE) * CELL_SIZE,
  }
}

function limitVector(x: number, y: number, maxMagnitude: number): Viewport {
  const magnitude = Math.hypot(x, y)
  if (magnitude <= maxMagnitude) return { x, y }

  const scale = maxMagnitude / magnitude
  return {
    x: x * scale,
    y: y * scale,
  }
}

function getReleaseTarget(
  viewport: Viewport,
  velocityX: number,
  velocityY: number,
) {
  const projected = limitVector(
    velocityX * RELEASE_PROJECTION_MS,
    velocityY * RELEASE_PROJECTION_MS,
    MAX_RELEASE_DISTANCE,
  )

  return getSettledViewport({
    x: viewport.x + projected.x,
    y: viewport.y + projected.y,
  })
}

export function Grid() {
  const viewportRef = useRef<Viewport>({ x: 0, y: 0 })
  const sizeRef = useRef<Size>(getSize())
  const layerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const releaseAnimationsRef = useRef<AnimationPlaybackControls[]>([])
  const releaseAnimationIdRef = useRef(0)
  const prefersReducedMotionRef = useRef(false)
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
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,
  })

  const renderViewport = useCallback(() => {
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
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      renderViewport()
    })
  }, [renderViewport])

  const stopReleaseMotion = useCallback(() => {
    releaseAnimationIdRef.current += 1
    releaseAnimationsRef.current.forEach((animation) => animation.stop())
    releaseAnimationsRef.current = []
  }, [])

  const settleViewport = useCallback(
    (velocityX = 0, velocityY = 0) => {
      stopReleaseMotion()

      if (prefersReducedMotionRef.current) {
        viewportRef.current = getSettledViewport(viewportRef.current)
        renderViewport()
        return
      }

      const releaseVelocity = limitVector(
        velocityX,
        velocityY,
        MAX_RELEASE_SPEED,
      )
      const target = getReleaseTarget(
        viewportRef.current,
        releaseVelocity.x,
        releaseVelocity.y,
      )
      const animationId = releaseAnimationIdRef.current + 1
      releaseAnimationIdRef.current = animationId
      const latest = { ...viewportRef.current }

      const commitLatest = () => {
        viewportRef.current = latest
        renderViewport()
      }

      const xAnimation = animate(latest.x, target.x, {
        ...RELEASE_SPRING,
        velocity: releaseVelocity.x * 1000,
        onUpdate: (value) => {
          latest.x = value
          commitLatest()
        },
      })

      const yAnimation = animate(latest.y, target.y, {
        ...RELEASE_SPRING,
        velocity: releaseVelocity.y * 1000,
        onUpdate: (value) => {
          latest.y = value
          commitLatest()
        },
      })

      releaseAnimationsRef.current = [xAnimation, yAnimation]
      Promise.all([xAnimation.finished, yAnimation.finished])
        .then(() => {
          if (releaseAnimationIdRef.current !== animationId) return
          viewportRef.current = target
          renderViewport()
          releaseAnimationsRef.current = []
        })
        .catch(() => {})
    },
    [renderViewport, stopReleaseMotion],
  )

  const onWindowResize = useEffectEvent(() => {
    sizeRef.current = getSize()
    scheduleViewportApply()
  })

  const onWindowPointerMove = useEffectEvent((e: PointerEvent) => {
    const ds = dragState.current
    if (!ds.isDragging) return
    const now = performance.now()
    const dx = e.clientX - ds.lastX
    const dy = e.clientY - ds.lastY
    const dt = now - ds.lastTime
    if (
      Math.abs(e.clientX - ds.startX) > 5 ||
      Math.abs(e.clientY - ds.startY) > 5
    ) {
      ds.hasMoved = true
    }
    ds.lastX = e.clientX
    ds.lastY = e.clientY
    ds.lastTime = now
    if (dt > 0) {
      const nextVelocityX = -dx / dt
      const nextVelocityY = -dy / dt
      ds.velocityX =
        ds.velocityX * (1 - VELOCITY_SMOOTHING) +
        nextVelocityX * VELOCITY_SMOOTHING
      ds.velocityY =
        ds.velocityY * (1 - VELOCITY_SMOOTHING) +
        nextVelocityY * VELOCITY_SMOOTHING
    }
    viewportRef.current = {
      x: viewportRef.current.x - dx,
      y: viewportRef.current.y - dy,
    }
    scheduleViewportApply()
  })

  const onWindowPointerUp = useEffectEvent(() => {
    const ds = dragState.current
    if (!ds.isDragging) return
    ds.isDragging = false
    if (ds.hasMoved) {
      settleViewport(ds.velocityX, ds.velocityY)
    }
  })

  const onWindowPointerCancel = useEffectEvent(() => {
    const ds = dragState.current
    ds.isDragging = false
    ds.velocityX = 0
    ds.velocityY = 0
  })

  useEffect(() => {
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onPreferenceChange = () => {
      prefersReducedMotionRef.current = media.matches
    }
    onPreferenceChange()
    media.addEventListener('change', onPreferenceChange)
    return () => media.removeEventListener('change', onPreferenceChange)
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerCancel)
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
      window.removeEventListener('pointercancel', onWindowPointerCancel)
    }
  }, [])

  const cells = useMemo<CellInfo[]>(() => {
    const out: CellInfo[] = []
    for (let r = 0; r < gridWindow.rows; r++) {
      for (let c = 0; c < gridWindow.cols; c++) {
        const col = gridWindow.startCol + c
        const row = gridWindow.startRow + r
        out.push({
          key: `${col},${row}`,
          name: getNameForCell(col, row),
          x: col * CELL_SIZE,
          y: row * CELL_SIZE,
        })
      }
    }
    return out
  }, [gridWindow])

  useEffect(() => {
    renderViewport()
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
      stopReleaseMotion()
    }
  }, [renderViewport, stopReleaseMotion])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    stopReleaseMotion()
    const now = performance.now()
    dragState.current = {
      isDragging: true,
      hasMoved: false,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: now,
      velocityX: 0,
      velocityY: 0,
    }
  }, [stopReleaseMotion])

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
