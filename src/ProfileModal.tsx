import { useEffect } from 'react'
import { getAvatarUrl, type Profile } from './api'
import { ProfileLinks } from './ProfileLinks'

interface ProfileModalProps {
  name: string
  profile: Profile | null
  onClose: () => void
}

export function ProfileModal({ name, profile, onClose }: ProfileModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      id="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="modal-content">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <img
          className="modal-avatar"
          src={profile?.avatarUrl || getAvatarUrl(name, 'md')}
          alt={name}
        />
        <h2 id="modal-title" className="modal-name">
          {name}
        </h2>
        {profile?.description && (
          <p className="modal-description">{profile.description}</p>
        )}
        {profile && <ProfileLinks profile={profile} />}
      </div>
    </div>
  )
}
