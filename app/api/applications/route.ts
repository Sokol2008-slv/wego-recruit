import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { inngest } from '@/lib/inngest/client'
import { MOCK_VACANCIES } from '@/lib/mock-vacancies'
import { addApplication, getApplicationsByCandidate } from '@/lib/mock-store'
import { sendMessageWithButtons } from '@/lib/telegram'

const AGENCY_CHAT_ID = process.env.TELEGRAM_AGENCY_CHAT_ID || ''

// GET — список заявок текущего кандидата
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    || req.cookies.get('wego_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const supabase = getDb()
  if (!supabase) {
    // Тестовый режим — из mock store, с данными вакансий
    const apps = getApplicationsByCandidate(payload.candidateId)
    const appsWithVacancies = apps.map(app => ({
      ...app,
      vacancy: MOCK_VACANCIES.find(v => v.id === app.vacancy_id) || null,
    }))
    return NextResponse.json({ applications: appsWithVacancies })
  }

  const { data, error } = await supabase
    .from('applications')
    .select('*, vacancy:vacancies(*)')
    .eq('candidate_id', payload.candidateId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ applications: data || [] })
}

// POST — подать заявку на вакансию
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    || req.cookies.get('wego_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  try {
    const { vacancyId } = await req.json()

    const supabase = getDb()
    if (!supabase) {
      // Тестовый режим — сохраняем в mock store
      const existing = getApplicationsByCandidate(payload.candidateId)
        .find(a => a.vacancy_id === vacancyId)
      if (existing) {
        return NextResponse.json({ error: 'Already applied' }, { status: 409 })
      }

      const mockApp = {
        id: `app-${Date.now()}`,
        created_at: new Date().toISOString(),
        candidate_id: payload.candidateId,
        vacancy_id: vacancyId,
        status: 'pending' as const,
      }
      addApplication(mockApp)

      // Найти вакансию для уведомления
      const vacancy = MOCK_VACANCIES.find(v => v.id === vacancyId)

      // Отправить Telegram с кнопками одобрить/отклонить
      if (AGENCY_CHAT_ID) {
        sendMessageWithButtons(
          AGENCY_CHAT_ID,
          `📩 <b>Новая заявка!</b>\n\n` +
          `👤 ${payload.name}\n` +
          `💼 ${vacancy?.title || 'Вакансия'} — ${vacancy?.company || ''}\n` +
          `📍 ${vacancy?.city}, ${vacancy?.country}`,
          [
            [
              { text: '✅ Одобрить', callback_data: `approve:${mockApp.id}` },
              { text: '❌ Отклонить', callback_data: `reject:${mockApp.id}` },
            ],
          ]
        ).catch(err => console.error('Telegram error:', err))
      }

      return NextResponse.json({ application: { ...mockApp, vacancy } })
    }

    // Supabase mode
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('candidate_id', payload.candidateId)
      .eq('vacancy_id', vacancyId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already applied' }, { status: 409 })
    }

    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        candidate_id: payload.candidateId,
        vacancy_id: vacancyId,
        status: 'pending',
      })
      .select('*, vacancy:vacancies(*, employer:employers(*))')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    inngest.send({
      name: "application.created",
      data: {
        applicationId: application.id,
        candidateId: payload.candidateId,
        vacancyId: vacancyId,
      },
    }).catch(err => console.error('Inngest send error:', err))

    return NextResponse.json({ application })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
