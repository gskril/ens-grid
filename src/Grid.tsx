import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
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
const FOCUS_SEARCH_RADIUS_ROWS = 4096
const FOCUS_DURATION = 1.2
const COL_STEP = 7919
const ROW_STEP = 104729
const ensNameSet = new Set(ensNames)

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}

function modularInverse(value: number, modulus: number): number {
  let oldR = value
  let r = modulus
  let oldS = 1
  let s = 0

  while (r !== 0) {
    const quotient = Math.floor(oldR / r)
    const nextR = oldR - quotient * r
    oldR = r
    r = nextR

    const nextS = oldS - quotient * s
    oldS = s
    s = nextS
  }

  return mod(oldS, modulus)
}

const COL_STEP_INVERSE = modularInverse(COL_STEP, ensNames.length)

function getNameForCell(col: number, row: number): string {
  const index = Math.abs((col * COL_STEP + row * ROW_STEP) % ensNames.length)
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

interface FocusTarget {
  col: number
  row: number
  key: string
  name: string
  x: number
  y: number
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

function normalizeSearchName(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return ''
  return trimmed.endsWith('.eth') ? trimmed : `${trimmed}.eth`
}

function getExactSearchWarning(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed.endsWith('.eth')) return ''

  const normalized = normalizeSearchName(trimmed)
  if (!normalized || ensNameSet.has(normalized)) return ''

  return `${normalized} does not have a functioning avatar`
}

function findMatchingNameIndex(query: string): number {
  const trimmed = query.trim().toLowerCase()
  const normalized = normalizeSearchName(query)
  if (!normalized) return -1

  const exactIndex = findExactNameIndex(normalized)
  if (exactIndex >= 0) return exactIndex

  if (trimmed.endsWith('.eth')) return -1

  const bareQuery = normalized.replace(/\.eth$/, '')
  const prefixIndex = ensNames.findIndex((name) => name.startsWith(bareQuery))
  if (prefixIndex >= 0) return prefixIndex

  return ensNames.findIndex((name) => name.includes(bareQuery))
}

function findExactNameIndex(value: string): number {
  const normalized = normalizeSearchName(value)
  if (!normalized) return -1

  return ensNames.findIndex((name) => name === normalized)
}

function getNearestFocusTarget(
  targetIndex: number,
  viewport: Viewport,
  size: Size,
): FocusTarget {
  const centerCol = (viewport.x + size.w / 2 - AVATAR_SIZE / 2) / CELL_SIZE
  const centerRow = (viewport.y + size.h / 2 - AVATAR_SIZE / 2) / CELL_SIZE
  const middleRow = Math.round(centerRow)
  let best: FocusTarget | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (
    let row = middleRow - FOCUS_SEARCH_RADIUS_ROWS;
    row <= middleRow + FOCUS_SEARCH_RADIUS_ROWS;
    row += 1
  ) {
    for (const signedIndex of [targetIndex, -targetIndex]) {
      const baseCol = mod(
        (signedIndex - row * ROW_STEP) * COL_STEP_INVERSE,
        ensNames.length,
      )
      const nearestWrap = Math.round((centerCol - baseCol) / ensNames.length)
      const col = baseCol + nearestWrap * ensNames.length
      const name = ensNames[targetIndex]

      if (getNameForCell(col, row) !== name) continue

      const distance = (col - centerCol) ** 2 + (row - centerRow) ** 2

      if (distance < bestDistance) {
        bestDistance = distance
        best = {
          col,
          row,
          key: `${col},${row}`,
          name,
          x: col * CELL_SIZE,
          y: row * CELL_SIZE,
        }
      }
    }
  }

  if (!best) {
    throw new Error('Unable to locate matching grid cell')
  }

  return best
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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMessage, setSearchMessage] = useState('')
  const [searchHasWarning, setSearchHasWarning] = useState(false)
  const [focusedCellKey, setFocusedCellKey] = useState<string | null>(null)
  const navigate = useNavigate()
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const routeName = useMemo(() => {
    if (pathname === '/') return null
    const segment = pathname.replace(/^\/+/, '').split('/')[0]
    if (!segment) return null
    return decodeURIComponent(segment)
  }, [pathname])

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

  const animateViewportTo = useCallback(
    (target: Viewport) => {
      stopReleaseMotion()

      if (prefersReducedMotionRef.current) {
        viewportRef.current = target
        renderViewport()
        return
      }

      const animationId = releaseAnimationIdRef.current + 1
      releaseAnimationIdRef.current = animationId
      const latest = { ...viewportRef.current }

      const commitLatest = () => {
        viewportRef.current = latest
        renderViewport()
      }

      const xAnimation = animate(latest.x, target.x, {
        duration: FOCUS_DURATION,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (value) => {
          latest.x = value
          commitLatest()
        },
      })

      const yAnimation = animate(latest.y, target.y, {
        duration: FOCUS_DURATION,
        ease: [0.22, 1, 0.36, 1],
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

  const searchSuggestions = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase()
    if (trimmed.endsWith('.eth')) return []

    const query = trimmed.replace(/\.eth$/, '')
    if (query.length < 2) return []

    const matches: string[] = []
    for (const name of ensNames) {
      if (name.startsWith(query) || name.includes(query)) {
        matches.push(name)
        if (matches.length === 6) break
      }
    }
    return matches
  }, [searchQuery])

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

  const focusSearchValue = useCallback(
    (value: string) => {
      const targetIndex = findMatchingNameIndex(value)
      if (targetIndex < 0) {
        const normalized = normalizeSearchName(value)
        const exactWarning = getExactSearchWarning(value)
        setSearchMessage(
          exactWarning ||
          (normalized
            ? `${normalized} does not have a functioning avatar`
            : 'Enter an ENS name to search'),
        )
        setSearchHasWarning(true)
        setFocusedCellKey(null)
        return
      }

      const target = getNearestFocusTarget(
        targetIndex,
        viewportRef.current,
        sizeRef.current,
      )
      setSearchQuery(target.name)
      setSearchMessage(`Focused ${target.name}`)
      setSearchHasWarning(false)
      setFocusedCellKey(target.key)
      animateViewportTo({
        x: target.x + AVATAR_SIZE / 2 - sizeRef.current.w / 2,
        y: target.y + AVATAR_SIZE / 2 - sizeRef.current.h / 2,
      })
    },
    [animateViewportTo],
  )

  const focusExactName = useCallback(
    (value: string) => {
      const targetIndex = findExactNameIndex(value)
      if (targetIndex < 0) {
        const normalized = normalizeSearchName(value)
        setSearchQuery(normalized)
        setSearchMessage(
          normalized ? `${normalized} does not have a functioning avatar` : '',
        )
        setSearchHasWarning(Boolean(normalized))
        setFocusedCellKey(null)
        return
      }

      const target = getNearestFocusTarget(
        targetIndex,
        viewportRef.current,
        sizeRef.current,
      )
      setSearchQuery(target.name)
      setSearchMessage(`Focused ${target.name}`)
      setSearchHasWarning(false)
      setFocusedCellKey(target.key)
      animateViewportTo({
        x: target.x + AVATAR_SIZE / 2 - sizeRef.current.w / 2,
        y: target.y + AVATAR_SIZE / 2 - sizeRef.current.h / 2,
      })
    },
    [animateViewportTo],
  )

  useEffect(() => {
    if (!routeName) return
    focusExactName(routeName)
  }, [focusExactName, routeName])

  const onSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      focusSearchValue(searchQuery)
    },
    [focusSearchValue, searchQuery],
  )

  return (
    <div id="grid-container" onPointerDown={onPointerDown}>
      <div id="grid-layer" ref={layerRef}>
        {cells.map((cell) => (
          <AvatarCell
            key={cell.key}
            cell={cell}
            onClick={onCellClick}
            isFocused={cell.key === focusedCellKey}
          />
        ))}
      </div>
      <form
        id="search-panel"
        role="search"
        onSubmit={onSearchSubmit}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <label htmlFor="ens-search">ENS name</label>
        <div className="search-row">
          <input
            id="ens-search"
            type="search"
            value={searchQuery}
            placeholder="Search ENS"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              const nextValue = e.target.value
              const exactWarning = getExactSearchWarning(nextValue)
              setSearchQuery(nextValue)
              setSearchMessage(exactWarning)
              setSearchHasWarning(Boolean(exactWarning))
              if (exactWarning) setFocusedCellKey(null)
            }}
          />
          <button type="submit">Focus</button>
        </div>
        {searchSuggestions.length > 0 && (
          <div className="search-suggestions">
            {searchSuggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => focusSearchValue(name)}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        <div
          id="search-status"
          className={searchHasWarning ? 'is-warning' : ''}
          role="status"
          aria-live="polite"
        >
          {searchMessage}
        </div>
      </form>
    </div>
  )
}
