import { inngest } from './client'
import { getDb } from '../supabase'
import { fetchSheetAsCSV, parseCSV, mapRowToVacancy } from '../google-sheets'

// Синхронизация вакансий из Google Sheets → Supabase
// Запускается по расписанию (пн-пт, 8:00 Warsaw) или вручную
export const syncVacancies = inngest.createFunction(
  {
    id: 'sync-vacancies-from-sheets',
    name: 'Sync vacancies from Google Sheets',
    retries: 3,
    triggers: [{ event: 'vacancies/sync' }],
  },
  async ({ step }) => {
    // Шаг 1: Загрузить CSV
    const csv = await step.run('fetch-sheet', async () => {
      return fetchSheetAsCSV()
    })

    // Шаг 2: Парсить и маппить
    const vacancies = await step.run('parse-vacancies', async () => {
      const rows = parseCSV(csv)
      return rows
        .map(mapRowToVacancy)
        .filter((v): v is NonNullable<typeof v> => v !== null)
    })

    if (vacancies.length === 0) {
      return { status: 'no_vacancies', message: 'Таблица пуста или не распознана' }
    }

    // Шаг 3: Обновить базу
    const result = await step.run('update-database', async () => {
      const supabase = getDb()
      if (!supabase) throw new Error('DB not configured')

      // Деактивируем все текущие вакансии из Google Sheets (source = 'google_sheets')
      await supabase
        .from('vacancies')
        .update({ active: false })
        .eq('source', 'google_sheets')

      let created = 0
      let updated = 0

      for (const v of vacancies) {
        // Ищем существующую вакансию по title + company
        const { data: existing } = await supabase
          .from('vacancies')
          .select('id')
          .eq('title', v.title)
          .eq('company', v.company)
          .eq('source', 'google_sheets')
          .limit(1)

        if (existing && existing.length > 0) {
          // Обновляем
          await supabase
            .from('vacancies')
            .update({
              country: v.country,
              city: v.city,
              salary: v.salary,
              housing: v.housing,
              schedule: v.schedule,
              description: v.description,
              requirements: v.requirements,
              tags: v.tags,
              active: true,
            })
            .eq('id', existing[0].id)
          updated++
        } else {
          // Создаём новую
          await supabase.from('vacancies').insert({
            title: v.title,
            company: v.company,
            country: v.country,
            city: v.city,
            salary: v.salary,
            housing: v.housing,
            schedule: v.schedule,
            description: v.description,
            requirements: v.requirements,
            tags: v.tags,
            category: v.category,
            active: true,
            source: 'google_sheets',
          })
          created++
        }
      }

      return { created, updated, total: vacancies.length }
    })

    return {
      status: 'success',
      ...result,
    }
  }
)

// Расписание: пн-пт в 8:00 по Варшаве
export const scheduledSync = inngest.createFunction(
  {
    id: 'scheduled-vacancy-sync',
    name: 'Scheduled vacancy sync (Mon-Fri 8:00)',
    triggers: [{ cron: '0 8 * * 1-5' }],
  },
  async ({ step }) => {
    await step.sendEvent('trigger-sync', {
      name: 'vacancies/sync',
      data: { trigger: 'scheduled' },
    })

    return { status: 'triggered' }
  }
)
