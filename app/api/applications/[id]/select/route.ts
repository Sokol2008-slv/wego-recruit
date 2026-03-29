import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { sendMessage, formatDateTime } from '@/lib/telegram'

// POST — worker selects an approved vacancy for a meeting
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  const { id } = await params

  // Verify application belongs to candidate and is approved
  const { data: app, error: appError } = await supabase
    .from('applications')
    .select('id, candidate_id, vacancy_id')
    .eq('id', id)
    .eq('candidate_id', payload.candidateId)
    .eq('status', 'approved')
    .single()

  if (appError || !app) {
    return NextResponse.json({ error: 'Application not found or not approved' }, { status: 404 })
  }

  // Mark as selected
  await supabase
    .from('applications')
    .update({
      status: 'selected',
      worker_selected_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Get selected vacancy + candidate info for notifications
  const { data: selectedApp } = await supabase
    .from('applications')
    .select('*, vacancy:vacancies(*, employer:employers(telegram_chat_id)), candidate:candidates(name, surname)')
    .eq('id', id)
    .single()

  // Auto-reject all other approved applications for this candidate
  const { data: otherApproved } = await supabase
    .from('applications')
    .select('id, vacancy_id, vacancy:vacancies(title, employer_id, employer:employers(telegram_chat_id))')
    .eq('candidate_id', payload.candidateId)
    .eq('status', 'approved')
    .neq('id', id)

  if (otherApproved && otherApproved.length > 0) {
    const otherIds = otherApproved.map(a => a.id)

    await supabase
      .from('applications')
      .update({ status: 'auto_rejected' })
      .in('id', otherIds)

    // Notify employers of auto-rejected applications
    const candidateName = `${selectedApp?.candidate?.name || ''} ${selectedApp?.candidate?.surname || ''}`.trim()
    for (const other of otherApproved) {
      const vacancy = other.vacancy as { title: string; employer_id: string; employer: { telegram_chat_id?: string } | null } | null
      const employerChatId = vacancy?.employer?.telegram_chat_id
      if (employerChatId) {
        const text = `ℹ️ Кандидат ${candidateName} выбрал другую компанию\nВакансия: ${vacancy?.title}\n\n🕐 ${formatDateTime()}`
        sendMessage(employerChatId, text).catch(err => console.error('Telegram employer notify error:', err))
      }
    }
  }

  // Send agency notification about the meeting selection
  const agencyChatId = process.env.TELEGRAM_AGENCY_CHAT_ID
  if (agencyChatId && selectedApp) {
    const candidate = selectedApp.candidate
    const vacancy = selectedApp.vacancy
    const candidateName = `${candidate?.name || ''} ${candidate?.surname || ''}`.trim()
    const text = `🤝 Назначена встреча!\nКандидат: ${candidateName}\nВыбрал: ${vacancy?.title} — ${vacancy?.company}\n📧 Отправить email с инструкциями для документов\n\n🕐 ${formatDateTime()}`
    sendMessage(agencyChatId, text).catch(err => console.error('Telegram agency notify error:', err))
  }

  return NextResponse.json({ success: true })
}
