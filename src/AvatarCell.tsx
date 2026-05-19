import { memo, useState } from 'react'
import { getAvatarUrl } from './api'
import type { CellInfo } from './Grid'

interface AvatarCellProps {
  cell: CellInfo
  onClick: (name: string) => void
  isFocused?: boolean
}

export const AvatarCell = memo(function AvatarCell({
  cell,
  onClick,
  isFocused = false,
}: AvatarCellProps) {
  const [failed, setFailed] = useState(false)
  return (
    <button
      type="button"
      className={`avatar-cell${failed ? ' no-avatar' : ''}${isFocused ? ' is-focused' : ''}`}
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
    </button>
  )
})
