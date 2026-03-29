// Google Sheets → Vacancies sync
// Таблица: https://docs.google.com/spreadsheets/d/1zzOrEwfNTfZJOmRQ67ijduKI5mmP5Cg6GgXA4n12buM
// Колонки: A = Вакансия, B = Описание (всё в одном тексте), C = Национальность/Документы

const SHEET_ID = '1zzOrEwfNTfZJOmRQ67ijduKI5mmP5Cg6GgXA4n12buM'
const SHEET_GID = '0'

export async function fetchSheetAsCSV(): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`)
  return res.text()
}

// Парсим CSV → массив объектов
export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim()
    })
    // Пропускаем пустые строки
    if (row['Вакансия']?.trim()) {
      rows.push(row)
    }
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)

  return result
}

// Тип вакансии для импорта
export type SheetVacancy = {
  title: string
  company: string
  country: string
  city: string
  salary: string
  housing: boolean
  housing_cost: string
  schedule: string
  description: string
  requirements: string
  tags: string[]
  category: 'blue_collar'
}

// Парсим описание (колонка B) — извлекаем структурированные данные из текста
export function mapRowToVacancy(row: Record<string, string>): SheetVacancy | null {
  const vacancyName = row['Вакансия']?.trim()
  if (!vacancyName) return null

  const desc = row['Описание'] || ''
  const docs = row['Национальность/Документы'] || ''

  // Извлекаем локацию
  const locationMatch = desc.match(/Локация[:\s]*([^\n]+)/i)
  const location = locationMatch ? locationMatch[1].trim() : ''

  // Определяем страну и город
  const country = detectCountry(location || desc)
  const city = extractCity(location || desc)

  // Извлекаем зарплату/ставку
  const salary = extractSalary(desc)

  // Извлекаем график
  const schedule = extractSchedule(desc)

  // Жильё
  const housingInfo = extractHousing(desc)

  // Компания — первая часть названия вакансии или ищем в тексте
  const company = extractCompany(vacancyName, desc)

  // Теги
  const tags: string[] = []
  if (country === 'PL') tags.push('Польша')
  if (country === 'DE') tags.push('Германия')
  if (country === 'BE') tags.push('Бельгия')
  if (desc.toLowerCase().includes('склад')) tags.push('Склад')
  if (desc.toLowerCase().includes('завод') || desc.toLowerCase().includes('производств')) tags.push('Завод')
  if (desc.toLowerCase().includes('погрузчик') || desc.toLowerCase().includes('forklift')) tags.push('Погрузчик')
  if (desc.toLowerCase().includes('муж') && desc.toLowerCase().includes('жен')) tags.push('М/Ж')

  // Формируем чистое описание для сайта
  const cleanDesc = cleanDescription(desc)

  return {
    title: vacancyName,
    company,
    country,
    city,
    salary,
    housing: housingInfo.available,
    housing_cost: housingInfo.cost,
    schedule,
    description: cleanDesc,
    requirements: docs || '',
    tags,
    category: 'blue_collar',
  }
}

function detectCountry(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('dąbrówka') || t.includes('dabrowka') || t.includes('warszaw') || t.includes('варшав') || t.includes('kraków') || t.includes('краков') || t.includes('wrocław') || t.includes('вроцлав') || t.includes('polska') || t.includes('польш') || t.includes('łódź') || t.includes('лодзь') || t.includes('poznań') || t.includes('познань') || t.includes('gdańsk') || t.includes('гданьск') || /\bzł\b/.test(t) || /\bpln\b/i.test(t)) return 'PL'
  if (t.includes('berlin') || t.includes('берлин') || t.includes('münchen') || t.includes('мюнхен') || t.includes('dortmund') || t.includes('дортмунд') || t.includes('deutschland') || t.includes('герман') || /\beur\b/i.test(t) || /€/.test(t)) return 'DE'
  if (t.includes('belgi') || t.includes('бельги') || t.includes('bruxelles') || t.includes('брюссел')) return 'BE'
  return 'PL' // По умолчанию Польша
}

function extractCity(text: string): string {
  const cities: Record<string, string> = {
    'dąbrówka': 'Домбрувка', 'dabrowka': 'Домбрувка',
    'warszawa': 'Варшава', 'warsaw': 'Варшава',
    'kraków': 'Краков', 'krakow': 'Краков',
    'wrocław': 'Вроцлав', 'wroclaw': 'Вроцлав',
    'łódź': 'Лодзь', 'lodz': 'Лодзь',
    'poznań': 'Познань', 'poznan': 'Познань',
    'gdańsk': 'Гданьск', 'gdansk': 'Гданьск',
    'szczecin': 'Щецин',
    'berlin': 'Берлин',
    'münchen': 'Мюнхен', 'munich': 'Мюнхен',
    'dortmund': 'Дортмунд',
  }

  const t = text.toLowerCase()
  for (const [key, value] of Object.entries(cities)) {
    if (t.includes(key)) return value
  }

  // Попробуем найти после "ul." или адрес
  const addrMatch = text.match(/(?:ul\.|str\.)\s*[^,]+,\s*[\d-]+\s+(\S+)/i)
  if (addrMatch) return addrMatch[1]

  return ''
}

function extractSalary(desc: string): string {
  // Ищем ставки в zł, EUR, €
  const patterns = [
    /(\d+[.,]?\d*)\s*[-–]\s*(\d+[.,]?\d*)\s*(zł|PLN|EUR|€)\s*\/?\s*(час|h|нетто|брутто)/gi,
    /(\d+[.,]?\d*)\s*(zł|PLN|EUR|€)\s*\/?\s*(час|h|нетто|брутто)/gi,
    /ставка[:\s]*(\d+[.,]?\d*)\s*[-–]\s*(\d+[.,]?\d*)\s*(zł|PLN|EUR|€)/gi,
    /(\d+[.,]?\d*)\s*[-–]\s*(\d+[.,]?\d*)\s*(zł|PLN|EUR|€)/gi,
    /(\d+[.,]?\d*)\s*(zł|PLN|EUR|€)/gi,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(desc)
    if (match) return match[0].trim()
  }

  return ''
}

function extractSchedule(desc: string): string {
  const lines = desc.split('\n')
  const scheduleLines: string[] = []
  let inSchedule = false

  for (const line of lines) {
    const l = line.trim()
    if (l.match(/график работы|смен[ыа]|график/i)) {
      inSchedule = true
      continue
    }
    if (inSchedule) {
      if (l.match(/^\d{1,2}:\d{2}/) || l.match(/понедельник|вторник|пн|пт|суббот|воскресен/i) || l.match(/^\d+\/\d+/)) {
        scheduleLines.push(l)
      } else if (l === '' || l.match(/^[📋🏠💰⚠️🔧📌✅❌🎯]/)) {
        inSchedule = false
      }
    }
  }

  if (scheduleLines.length > 0) return scheduleLines.join(', ')

  // Простые паттерны
  const simpleMatch = desc.match(/(\d+)\s*час(?:ов)?\s*(?:в\s*(?:день|смену))?/i)
  if (simpleMatch) return `${simpleMatch[1]} часов`

  return ''
}

function extractHousing(desc: string): { available: boolean; cost: string } {
  const t = desc.toLowerCase()

  if (t.includes('жильё') || t.includes('жилье') || t.includes('проживание') || t.includes('общежити') || t.includes('комнат')) {
    // Ищем стоимость
    const costMatch = desc.match(/(?:жиль[её]|проживание|общежитие)[^.]*?(\d+[.,]?\d*)\s*(zł|PLN|EUR|€)/i)
    if (costMatch) {
      return { available: true, cost: `${costMatch[1]} ${costMatch[2]}` }
    }
    const costMatch2 = desc.match(/(\d+[.,]?\d*)\s*(zł|PLN|EUR|€)\s*(?:за\s*)?(?:месяц|мес|в месяц|неделю)/i)
    if (costMatch2) {
      return { available: true, cost: `${costMatch2[1]} ${costMatch2[2]}` }
    }
    return { available: true, cost: '' }
  }

  return { available: false, cost: '' }
}

function extractCompany(vacancyName: string, desc: string): string {
  // Часто название компании — первая часть названия вакансии (напр. "GRODNO")
  const parts = vacancyName.split('\n').filter(p => p.trim())
  if (parts.length > 1) {
    return parts[0].trim()
  }

  // Ищем в описании
  const companyMatch = desc.match(/(?:компания|работодатель|фирма)[:\s]*([^\n,]+)/i)
  if (companyMatch) return companyMatch[1].trim()

  return parts[0] || 'Не указано'
}

function cleanDescription(desc: string): string {
  // Убираем эмодзи-заголовки, оставляем чистый текст
  return desc
    .replace(/[📍⚙️🧩👥🕐🏠💰⚠️🔧📌✅❌🎯📋🔹]/g, '')
    .replace(/Локация:[^\n]*/i, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l)
    .join('\n')
    .trim()
}
