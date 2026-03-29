import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'
import { sendMessage, formatDateTime } from '@/lib/telegram'

const AGENCY_CHAT_ID = process.env.TELEGRAM_AGENCY_CHAT_ID || ''

// POST — candidate confirms they're available (called from Telegram callback)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getDb()
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  const { id } = await params

  const { data: meeting, error } = await supabase
    .from('meetings')
    .update({
      candidate_confirmed: true,
      candidate_confirmed_at: new Date().toISOString(),
      status: 'confirmed',
    })
    .eq('id', id)
    .select('*, candidate:candidates(id, name, surname, telegram_id), vacancy:vacancies(id, title)')
    .single()

  if (error || !meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  const candidateName = `${meeting.candidate?.name || ''} ${meeting.candidate?.surname || ''}`.trim()

  // Notify agency
  if (AGENCY_CHAT_ID) {
    const text = `✅ <b>Кандидат ${candidateName} подтвердил встречу</b>\n\n` +
      `💼 ${meeting.vacancy?.title || 'Вакансия'}\n` +
      `📆 ${formatDateTime(meeting.scheduled_at)}\n\n` +
      `🕐 ${formatDateTime()}`
    sendMessage(AGENCY_CHAT_ID, text).catch(err => console.error('Telegram error:', err))
  }

  return NextResponse.json({ success: true, meeting })
}
