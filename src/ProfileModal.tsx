import { useEffect } from 'react'
import { getAvatarUrl, type Profile } from './api'
import { ProfileLinks, countRecords } from './ProfileLinks'

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

  const recordCount = profile ? countRecords(profile) : 0

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
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="modal-body">
          <div className="modal-avatar-wrap">
            <img
              className="modal-avatar"
              src={profile?.avatarUrl || getAvatarUrl(name, 'md')}
              alt={name}
            />
          </div>

          <div className="modal-content">
            <h2 id="modal-title" className="modal-name">
              {name}
            </h2>
            {profile?.description && (
              <p className="modal-description">{profile.description}</p>
            )}

            {profile && recordCount > 0 ? (
              <ProfileLinks profile={profile} />
            ) : (
              <p className="modal-empty">— No public records on file —</p>
            )}
          </div>
        </div>

        <footer className="modal-footer">
          <span>
            <kbd>esc</kbd> to close
          </span>
        </footer>
      </div>
    </div>
  )
}
