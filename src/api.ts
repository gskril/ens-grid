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
  const baseUrl = 'https://ens-images.gregskril.com/mainnet'
  return `${baseUrl}/avatar/${name}?width=${width}`
}

export async function fetchProfile(name: string): Promise<Profile | null> {
  try {
    const texts = 'description,com.twitter,com.github,url,email,com.discord'
    const baseUrl = 'https://ens-api.gregskril.com'
    const response = await fetch(`${baseUrl}/name/${name}?texts=${texts}`)
    if (!response.ok) return null
    const data = await response.json()
    return {
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
  } catch {
    return null
  }
}
