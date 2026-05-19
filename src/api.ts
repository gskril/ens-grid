export const API_BASE = 'https://ens-api.gregskril.com'

export interface Profile {
  name: string
  avatarUrl: string
  address?: string
  description?: string
  url?: string
  twitter?: string
  github?: string
  discord?: string
  email?: string
}

export function getAvatarUrl(name: string, size: 'sm' | 'md' = 'sm'): string {
  const width = size === 'md' ? 256 : 160
  return `${API_BASE}/avatar/${name}?width=${width}`
}

const profileCache = new Map<string, Promise<Profile | null>>()

export function fetchProfile(name: string): Promise<Profile | null> {
  const cached = profileCache.get(name)
  if (cached) return cached

  const promise = (async () => {
    try {
      const texts = 'description,com.twitter,com.github,url,email,com.discord'
      const response = await fetch(`${API_BASE}/name/${name}?texts=${texts}`)
      if (!response.ok) return null
      const data = await response.json()
      const profile: Profile = {
        name,
        avatarUrl: data.avatar?.md || getAvatarUrl(name, 'md'),
        address: data.address,
        description: data.texts?.['description'] || '',
        url: data.texts?.['url'],
        twitter: data.texts?.['com.twitter'],
        github: data.texts?.['com.github'],
        discord: data.texts?.['com.discord'],
        email: data.texts?.['email'],
      }
      return profile
    } catch {
      return null
    }
  })()

  profileCache.set(name, promise)
  return promise
}
