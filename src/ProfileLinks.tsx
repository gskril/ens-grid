import type { Profile } from './api'

interface RecordRow {
  label: string
  value: string
  href?: string
  external?: boolean
}

function buildRows(profile: Profile): RecordRow[] {
  const twitter = profile.twitter?.replace('@', '')
  const github = profile.github?.replace('@', '')
  const rows: RecordRow[] = []

  if (profile.url) {
    rows.push({
      label: 'Website',
      value: profile.url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      href: profile.url,
      external: true,
    })
  }
  if (twitter) {
    rows.push({
      label: 'Twitter',
      value: `@${twitter}`,
      href: `https://x.com/${twitter}`,
      external: true,
    })
  }
  if (github) {
    rows.push({
      label: 'GitHub',
      value: github,
      href: `https://github.com/${github}`,
      external: true,
    })
  }
  if (profile.discord) {
    rows.push({
      label: 'Discord',
      value: profile.discord,
    })
  }
  if (profile.email) {
    rows.push({
      label: 'Email',
      value: profile.email,
      href: `mailto:${profile.email}`,
    })
  }
  if (profile.address) {
    rows.push({
      label: 'ETH address',
      value: `${profile.address.slice(0, 6)}…${profile.address.slice(-4)}`,
      href: `https://etherscan.io/address/${profile.address}`,
      external: true,
    })
  }

  return rows
}

export function countRecords(profile: Profile): number {
  return buildRows(profile).length
}

export function ProfileLinks({ profile }: { profile: Profile }) {
  const rows = buildRows(profile)
  if (rows.length === 0) return null

  return (
    <ul className="modal-links">
      {rows.map((row, i) => {
        const arrow = row.external ? '↗' : row.href ? '→' : '·'
        const body = row.href ? (
          <a
            href={row.href}
            target={row.external ? '_blank' : undefined}
            rel={row.external ? 'noopener noreferrer' : undefined}
          >
            {row.value}
          </a>
        ) : (
          <span className="link-value">{row.value}</span>
        )

        return (
          <li key={`${row.label}-${i}`}>
            <span className="link-label">{row.label}</span>
            {body}
            <span className="link-arrow" aria-hidden="true">
              {arrow}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
