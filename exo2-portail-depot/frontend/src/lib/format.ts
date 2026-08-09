/** Formatage francais, base sur Intl : pas de dependance de dates a justifier. */

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})
const relativeFormatter = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso))
}

const MS_PER_DAY = 86_400_000
const MS_PER_HOUR = 3_600_000

/** "dans 4 jours", "dans 3 heures", "il y a 2 jours". */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const deltaMs = new Date(iso).getTime() - now.getTime()
  const absMs = Math.abs(deltaMs)

  if (absMs >= MS_PER_DAY) {
    return relativeFormatter.format(Math.trunc(deltaMs / MS_PER_DAY), 'day')
  }
  if (absMs >= MS_PER_HOUR) {
    return relativeFormatter.format(Math.trunc(deltaMs / MS_PER_HOUR), 'hour')
  }
  return relativeFormatter.format(Math.trunc(deltaMs / 60_000), 'minute')
}

export function isExpired(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() <= now.getTime()
}

const SIZE_UNITS = ['o', 'Ko', 'Mo', 'Go'] as const

/** "2,4 Mo" — separateur decimal francais, comme dans la charte. */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 o'

  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const decimals = unitIndex === 0 || value >= 100 ? 0 : 1
  return `${value.toFixed(decimals).replace('.', ',')} ${SIZE_UNITS[unitIndex]}`
}

/** "2 pieces sur 4" — accord du pluriel inclus. */
export function formatProgress(uploaded: number, expected: number): string {
  const noun = uploaded > 1 ? 'pieces' : 'piece'
  return `${uploaded} ${noun} sur ${expected}`
}

export function formatCount(count: number): string {
  return `${count} ${count > 1 ? 'pieces' : 'piece'}`
}
