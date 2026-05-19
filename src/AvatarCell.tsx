import { memo, useState } from 'react'
import { getAvatarUrl } from './api'
import type { CellInfo } from './Grid'

interface AvatarCellProps {
  cell: CellInfo
  onClick: (name: string) => void
  isFocused?: boolean
  loadImage?: boolean
  isPriority?: boolean
}

export const AvatarCell = memo(function AvatarCell({
  cell,
  onClick,
  isFocused = false,
  loadImage = true,
  isPriority = false,
}: AvatarCellProps) {
  const [failed, setFailed] = useState(false)
  const className = [
    'avatar-cell',
    failed ? ' no-avatar' : '',
    isFocused ? ' is-focused' : '',
    loadImage ? '' : ' is-placeholder',
  ].join('')

  return (
    <button
      type="button"
      className={className}
      style={{ transform: `translate(${cell.x}px, ${cell.y}px)` }}
      onClick={() => {
        if (loadImage) onClick(cell.name)
      }}
      tabIndex={loadImage ? 0 : -1}
      title={loadImage ? cell.name : undefined}
    >
      {loadImage && !failed && (
        <img
          src={getAvatarUrl(cell.name)}
          alt={cell.name}
          loading={isPriority ? 'eager' : 'lazy'}
          fetchPriority={isPriority ? 'high' : 'auto'}
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </button>
  )
})
