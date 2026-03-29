import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'
import { sendMessage, formatDateTime } from '@/lib/telegram'
import { inngest } from '@/lib/inngest/client'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wego2026'
const AGENCY_CHAT_ID = process.env.TELEGRAM_AGENCY_CHAT_ID || ''

function checkAuth(req: NextRequest): boolean {
  const email = (req.headers.get('X-Admin-Email') || '').toLowerCase().trim()
  const password = req.headers.get('X-Admin-Password') || ''
  return ADMIN_EMAILS.includes(email) && password === ADMIN_PASSWORD
}

// GET — list all meetings with candidate + vacancy data
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getDb()
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('meetings')
    .select('*, candidate:candidates(id, name, surname, phone, telegram, telegram_id), vacancy:vacancies(id, title, company, city, country)')
    .order('scheduled_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ meetings: data })
}

// POST — create a meeting
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getDb()
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  try {
    const { applicationId, scheduledAt } = await req.json()

    if (!applicationId || !scheduledAt) {
      return NextResponse.json({ error: 'applicationId and scheduledAt are required' }, { status: 400 })
    }

    // Fetch application with candidate and vacancy data
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('*, candidate:candidates(*), vacancy:vacancies(*)')
      .eq('id', applicationId)
      .single()

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Create meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        application_id: applicationId,
        candidate_id: app.candidate_id,
        vacancy_id: app.vacancy_id,
        scheduled_at: scheduledAt,
        status: 'scheduled',
      })
      .select('*, candidate:candidates(id, name, surname, phone, telegram, telegram_id), vacancy:vacancies(id, title, company, city, country)')
      .single()

    if (meetingError) {
      return NextResponse.json({ error: meetingError.message }, { status: 500 })
    }

    // Update application status
    await supabase
      .from('applications')
      .update({ status: 'meeting_scheduled' })
      .eq('id', applicationId)

    const candidateName = `${app.candidate?.name || ''} ${app.candidate?.surname || ''}`.trim()
    const vacancyTitle = app.vacancy?.title || 'Вакансия'
    const formattedDate = formatDateTime(scheduledAt)

    // Notify agency
    if (AGENCY_CHAT_ID) {
      const text = `📅 <b>Встреча назначена!</b>\n\n` +
        `👤 Кандидат: ${candidateName}\n` +
        `💼 Вакансия: ${vacancyTitle}\n` +
        `📆 Дата: ${formattedDate}\n\n` +
        `🕐 ${formatDateTime()}`
      sendMessage(AGENCY_CHAT_ID, text).catch(err => console.error('Telegram error:', err))
    }

    // Notify candidate if has telegram_id
    if (app.candidate?.telegram_id) {
      const text = `📅 <b>Вам назначена встреча!</b>\n\n` +
        `💼 Вакансия: ${vacancyTitle}\n` +
        `📆 Дата: ${formattedDate}\n\n` +
        `Мы напомним вам за 2 часа до встречи.\n\n` +
        `🕐 ${formatDateTime()}`
      sendMessage(app.candidate.telegram_id, text).catch(err => console.error('Telegram error:', err))
    }

    // Send Inngest event for reminder scheduling
    inngest.send({
      name: 'meeting.scheduled',
      data: {
        meetingId: meeting.id,
        scheduledAt: scheduledAt,
        candidateId: app.candidate_id,
        candidateName,
        vacancyTitle,
        candidateTelegramId: app.candidate?.telegram_id || null,
      },
    }).catch(err => console.error('Inngest send error:', err))

    return NextResponse.json({ meeting })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
