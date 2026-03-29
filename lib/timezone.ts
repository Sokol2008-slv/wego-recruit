export function getTimezone(country: string): string {
  const map: Record<string, string> = {
    'ukraine': 'Europe/Kyiv',
    'UA': 'Europe/Kyiv',
    'poland': 'Europe/Warsaw',
    'PL': 'Europe/Warsaw',
    'germany': 'Europe/Berlin',
    'DE': 'Europe/Berlin',
    'czech': 'Europe/Prague',
    'CZ': 'Europe/Prague',
  }
  return map[country] || 'Europe/Warsaw'
}

export function formatDateTimeForCountry(date: Date | string, country: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const tz = getTimezone(country)
  return d.toLocaleString('ru-RU', {
    timeZone: tz,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
