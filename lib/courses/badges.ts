export interface Badge {
  id: string
  moduleId: string
  name: string
  nameEs: string
  icon: string
  description: string
  descriptionEs: string
}

export const BADGES: Badge[] = [
  { id: 'spotter-mindset', moduleId: 'module-1', name: "Spotter's Mindset", nameEs: 'Mentalidad del Spotter', icon: '🧠', description: 'Completed the fundamentals of spotting', descriptionEs: 'Completó los fundamentos del spotting' },
  { id: 'stain-family-expert', moduleId: 'module-2', name: 'Stain Family Expert', nameEs: 'Experto en Familias de Manchas', icon: '🧪', description: 'Mastered stain classification', descriptionEs: 'Dominó la clasificación de manchas' },
  { id: 'fiber-master', moduleId: 'module-3', name: 'Fiber Master', nameEs: 'Maestro de Fibras', icon: '🧵', description: 'Mastered fiber identification', descriptionEs: 'Dominó la identificación de fibras' },
  { id: 'chemical-arsenal', moduleId: 'module-4', name: 'Chemical Arsenal', nameEs: 'Arsenal Químico', icon: '⚗️', description: 'Mastered spotting chemicals', descriptionEs: 'Dominó los químicos de spotting' },
  { id: 'board-ready', moduleId: 'module-5', name: 'Board Ready', nameEs: 'Listo para la Mesa', icon: '✅', description: 'Completed the spotting process', descriptionEs: 'Completó el proceso de spotting' },
  { id: 'case-closer', moduleId: 'module-6', name: 'Case Closer', nameEs: 'Cierra Casos', icon: '📋', description: 'Mastered real-world scenarios', descriptionEs: 'Dominó escenarios del mundo real' },
  { id: 'customer-pro', moduleId: 'module-7', name: 'Customer Pro', nameEs: 'Profesional del Cliente', icon: '🤝', description: 'Mastered customer communication', descriptionEs: 'Dominó la comunicación con el cliente' },
]

const BADGE_STORAGE_KEY = 'gonr_badges'

export function getEarnedBadges(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(BADGE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function earnBadge(badgeId: string): void {
  if (typeof window === 'undefined') return
  const earned = getEarnedBadges()
  if (!earned.includes(badgeId)) {
    earned.push(badgeId)
    localStorage.setItem(BADGE_STORAGE_KEY, JSON.stringify(earned))
  }
}

export function hasBadge(badgeId: string): boolean {
  return getEarnedBadges().includes(badgeId)
}

export function getSpotterScore(): number {
  return getEarnedBadges().length * 10
}
