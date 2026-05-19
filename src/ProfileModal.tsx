import { useEffect } from 'react'
import { getAvatarUrl, type Profile } from './api'

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
      className="open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
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
        <h2 className="modal-name">{name}</h2>
        {profile?.description && (
          <p className="modal-description">{profile.description}</p>
        )}
        <div className="modal-links">
          {profile?.url && (
            <a href={profile.url} target="_blank" rel="noopener noreferrer">
              Website
            </a>
          )}
          {profile?.twitter && (
            <a
              href={`https://x.com/${profile.twitter.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              @{profile.twitter.replace('@', '')}
            </a>
          )}
          {profile?.github && (
            <a
              href={`https://github.com/${profile.github.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              github/{profile.github.replace('@', '')}
            </a>
          )}
          {profile?.discord && <span>Discord: {profile.discord}</span>}
          {profile?.email && (
            <a href={`mailto:${profile.email}`}>{profile.email}</a>
          )}
        </div>
      </div>
    </div>
  )
}
