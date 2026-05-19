import type { Profile } from './api'

export function ProfileLinks({ profile }: { profile: Profile }) {
  const twitter = profile.twitter?.replace('@', '')
  const github = profile.github?.replace('@', '')

  return (
    <div className="modal-links">
      {profile.url && (
        <a href={profile.url} target="_blank" rel="noopener noreferrer">
          Website
        </a>
      )}
      {twitter && (
        <a
          href={`https://x.com/${twitter}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          @{twitter}
        </a>
      )}
      {github && (
        <a
          href={`https://github.com/${github}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          github/{github}
        </a>
      )}
      {profile.discord && <span>Discord: {profile.discord}</span>}
      {profile.email && (
        <a href={`mailto:${profile.email}`}>{profile.email}</a>
      )}
    </div>
  )
}
