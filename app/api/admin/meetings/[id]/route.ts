import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'
import { sendMessage, formatDateTime } from '@/lib/telegram'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wego2026'
const AGENCY_CHAT_ID = process.env.TELEGRAM_AGENCY_CHAT_ID || ''

function checkAuth(req: NextRequest): boolean {
  const email = (req.headers.get('X-Admin-Email') || '').toLowerCase().trim()
  const password = req.headers.get('X-Admin-Password') || ''
  return ADMIN_EMAILS.includes(email) && password === ADMIN_PASSWORD
}

// PATCH — update meeting
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getDb()
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { docsStatus, status, cancelReason, scheduledAt } = body

    // Build update object
    const update: Record<string, unknown> = {}

    if (docsStatus !== undefined) {
      update.docs_status = docsStatus
      if (docsStatus === 'approved') {
        update.docs_approved_at = new Date().toISOString()
      }
    }

    if (status !== undefined) {
      update.status = status
      if (status === 'cancelled') {
        update.cancelled_at = new Date().toISOString()
        if (cancelReason) {
          update.cancel_reason = cancelReason
        }
      }
    }

    if (scheduledAt !== undefined) {
      update.scheduled_at = scheduledAt
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: meeting, error } = await supabase
      .from('meetings')
      .update(update)
      .eq('id', id)
      .select('*, candidate:candidates(id, name, surname, phone, telegram, telegram_id), vacancy:vacancies(id, title, company, city, country)')
      .single()

    if (error || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    const candidateName = `${meeting.candidate?.name || ''} ${meeting.candidate?.surname || ''}`.trim()

    // Send notifications based on changes
    if (docsStatus === 'approved' && AGENCY_CHAT_ID) {
      const text = `✅ <b>Документы одобрены</b> для ${candidateName}\n\n🕐 ${formatDateTime()}`
      sendMessage(AGENCY_CHAT_ID, text).catch(err => console.error('Telegram error:', err))
    }

    if (status === 'cancelled') {
      // Notify agency
      if (AGENCY_CHAT_ID) {
        const reason = cancelReason || 'Без причины'
        const text = `❌ <b>Встреча отменена</b>\n\n` +
          `👤 ${candidateName}\n` +
          `💬 Причина: ${reason}\n\n` +
          `🕐 ${formatDateTime()}`
        sendMessage(AGENCY_CHAT_ID, text).catch(err => console.error('Telegram error:', err))
      }

      // Update meeting's application back to 'approved'
      await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', meeting.application_id)

      // Also reset any 'selected' applications for this candidate back to 'approved'
      await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('candidate_id', meeting.candidate_id)
        .eq('status', 'selected')
    }

    if (status === 'confirmed' && AGENCY_CHAT_ID) {
      const text = `✅ <b>Кандидат ${candidateName} подтвердил встречу</b>\n\n🕐 ${formatDateTime()}`
      sendMessage(AGENCY_CHAT_ID, text).catch(err => console.error('Telegram error:', err))
    }

    return NextResponse.json({ meeting })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
