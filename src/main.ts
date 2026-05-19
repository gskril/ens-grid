import './style.css'
import { ensNames } from './names'

const AVATAR_SIZE = 80
const GAP = 8
const CELL_SIZE = AVATAR_SIZE + GAP

interface Profile {
  name: string
  avatarUrl: string
  description?: string
  url?: string
  twitter?: string
  discord?: string
  email?: string
}

const profileCache = new Map<string, Profile | null>()
let viewportX = 0
let viewportY = 0
let isDragging = false
let lastMouseX = 0
let lastMouseY = 0
let modalOpen = false

const gridContainer = document.createElement('div')
gridContainer.id = 'grid-container'
document.getElementById('app')!.appendChild(gridContainer)

const modal = document.createElement('div')
modal.id = 'modal'
modal.innerHTML = `
  <div class="modal-content">
    <button class="modal-close">&times;</button>
    <img class="modal-avatar" src="" alt="" />
    <h2 class="modal-name"></h2>
    <p class="modal-description"></p>
    <div class="modal-links"></div>
  </div>
`
document.body.appendChild(modal)

function getNameForCell(col: number, row: number): string {
  const index = Math.abs((col * 7919 + row * 104729) % ensNames.length)
  return ensNames[index]
}

function getAvatarUrl(name: string): string {
  return `https://metadata.ens.domains/mainnet/avatar/${name}`
}

async function fetchProfile(name: string): Promise<Profile | null> {
  if (profileCache.has(name)) {
    return profileCache.get(name)!
  }

  try {
    const response = await fetch(`https://enstate.rs/n/${name}`)
    if (!response.ok) {
      profileCache.set(name, null)
      return null
    }
    const data = await response.json()
    const profile: Profile = {
      name,
      avatarUrl: getAvatarUrl(name),
      description: data.records?.['description'] || data.records?.['com.twitter'] || '',
      url: data.records?.['url'],
      twitter: data.records?.['com.twitter'],
      discord: data.records?.['com.discord'],
      email: data.records?.['email'],
    }
    profileCache.set(name, profile)
    return profile
  } catch {
    profileCache.set(name, null)
    return null
  }
}

function renderGrid() {
  const cols = Math.ceil(window.innerWidth / CELL_SIZE) + 2
  const rows = Math.ceil(window.innerHeight / CELL_SIZE) + 2

  const startCol = Math.floor(viewportX / CELL_SIZE)
  const startRow = Math.floor(viewportY / CELL_SIZE)

  const offsetX = -(viewportX % CELL_SIZE)
  const offsetY = -(viewportY % CELL_SIZE)

  const existingCells = new Map<string, HTMLElement>()
  gridContainer.querySelectorAll('.avatar-cell').forEach((el) => {
    const cell = el as HTMLElement
    existingCells.set(cell.dataset.key!, cell)
  })

  const neededKeys = new Set<string>()

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const col = startCol + c
      const row = startRow + r
      const key = `${col},${row}`
      neededKeys.add(key)

      let cell = existingCells.get(key)
      if (!cell) {
        const name = getNameForCell(col, row)
        cell = document.createElement('div')
        cell.className = 'avatar-cell'
        cell.dataset.key = key
        cell.dataset.name = name

        const img = document.createElement('img')
        img.src = getAvatarUrl(name)
        img.alt = name
        img.loading = 'lazy'
        img.onerror = () => {
          img.style.display = 'none'
          cell!.classList.add('no-avatar')
        }
        cell.appendChild(img)
        gridContainer.appendChild(cell)

        cell.addEventListener('click', () => openModal(name))
      }

      cell.style.transform = `translate(${offsetX + c * CELL_SIZE}px, ${offsetY + r * CELL_SIZE}px)`
    }
  }

  existingCells.forEach((cell, key) => {
    if (!neededKeys.has(key)) {
      cell.remove()
    }
  })
}

async function openModal(name: string) {
  if (isDragging) return
  modalOpen = true

  const profile = await fetchProfile(name)
  const avatarImg = modal.querySelector('.modal-avatar') as HTMLImageElement
  const nameEl = modal.querySelector('.modal-name') as HTMLElement
  const descEl = modal.querySelector('.modal-description') as HTMLElement
  const linksEl = modal.querySelector('.modal-links') as HTMLElement

  avatarImg.src = getAvatarUrl(name)
  nameEl.textContent = name

  if (profile) {
    descEl.textContent = profile.description || ''
    let linksHtml = ''
    if (profile.url) {
      linksHtml += `<a href="${profile.url}" target="_blank" rel="noopener">Website</a>`
    }
    if (profile.twitter) {
      const handle = profile.twitter.replace('@', '')
      linksHtml += `<a href="https://x.com/${handle}" target="_blank" rel="noopener">@${handle}</a>`
    }
    if (profile.discord) {
      linksHtml += `<span>Discord: ${profile.discord}</span>`
    }
    if (profile.email) {
      linksHtml += `<a href="mailto:${profile.email}">${profile.email}</a>`
    }
    linksEl.innerHTML = linksHtml
  } else {
    descEl.textContent = ''
    linksEl.innerHTML = ''
  }

  modal.classList.add('open')
}

function closeModal() {
  modalOpen = false
  modal.classList.remove('open')
}

modal.querySelector('.modal-close')!.addEventListener('click', closeModal)
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal()
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOpen) closeModal()
})

let dragStartX = 0
let dragStartY = 0
let hasMoved = false

gridContainer.addEventListener('mousedown', (e) => {
  isDragging = true
  hasMoved = false
  lastMouseX = e.clientX
  lastMouseY = e.clientY
  dragStartX = e.clientX
  dragStartY = e.clientY
  gridContainer.style.cursor = 'grabbing'
})

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return

  const dx = e.clientX - lastMouseX
  const dy = e.clientY - lastMouseY

  if (Math.abs(e.clientX - dragStartX) > 5 || Math.abs(e.clientY - dragStartY) > 5) {
    hasMoved = true
  }

  viewportX -= dx
  viewportY -= dy

  lastMouseX = e.clientX
  lastMouseY = e.clientY

  renderGrid()
})

document.addEventListener('mouseup', () => {
  isDragging = false
  gridContainer.style.cursor = 'grab'
  setTimeout(() => {
    if (!hasMoved) {
      isDragging = false
    }
  }, 0)
})

gridContainer.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isDragging = true
    hasMoved = false
    lastMouseX = e.touches[0].clientX
    lastMouseY = e.touches[0].clientY
    dragStartX = e.touches[0].clientX
    dragStartY = e.touches[0].clientY
  }
})

gridContainer.addEventListener('touchmove', (e) => {
  if (!isDragging || e.touches.length !== 1) return
  e.preventDefault()

  const dx = e.touches[0].clientX - lastMouseX
  const dy = e.touches[0].clientY - lastMouseY

  if (Math.abs(e.touches[0].clientX - dragStartX) > 10 || Math.abs(e.touches[0].clientY - dragStartY) > 10) {
    hasMoved = true
  }

  viewportX -= dx
  viewportY -= dy

  lastMouseX = e.touches[0].clientX
  lastMouseY = e.touches[0].clientY

  renderGrid()
}, { passive: false })

gridContainer.addEventListener('touchend', () => {
  isDragging = false
})

window.addEventListener('resize', renderGrid)

renderGrid()
