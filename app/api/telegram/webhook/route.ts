import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'
import {
  sendMessage,
  answerCallbackQuery,
  editMessageText,
  formatDateTime,
} from '@/lib/telegram'
import { getApplicationById, updateApplicationStatus } from '@/lib/mock-store'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://recruit-starter.vercel.app'

export async function POST(req: NextRequest) {
  const supabase = getDb()
  try {
    const body = await req.json()

    // Handle /start command
    if (body.message?.text?.startsWith('/start')) {
      const chatId = body.message.chat.id.toString()
      const firstName = body.message.from?.first_name || ''

      await sendMessage(
        chatId,
        `👋 Добро пожаловать в <b>WEGO</b>, ${firstName}!\n\n` +
        `Мы помогаем найти работу за рубежом.\n\n` +
        `👉 Перейдите на наш сайт для регистрации:\n` +
        `<a href="${SITE_URL}/worker">${SITE_URL}/worker</a>\n\n` +
        `Ваш Chat ID: <code>${chatId}</code>`
      )
      return NextResponse.json({ ok: true })
    }

    // Handle callback queries (approve/reject buttons)
    if (body.callback_query) {
      const callbackId = body.callback_query.id
      const data = body.callback_query.data as string
      const chatId = body.callback_query.message?.chat.id.toString()
      const messageId = body.callback_query.message?.message_id

      if (!data || !chatId || !messageId) {
        await answerCallbackQuery(callbackId, 'Ошибка')
        return NextResponse.json({ ok: true })
      }

      const [action, applicationId] = data.split(':')

      // Handle meeting confirmation/decline
      if (action === 'confirm_meeting') {
        const meetingId = applicationId // reuse the split variable
        if (supabase) {
          const { data: meeting, error: meetErr } = await supabase
            .from('meetings')
            .update({
              candidate_confirmed: true,
              candidate_confirmed_at: new Date().toISOString(),
              status: 'confirmed',
            })
            .eq('id', meetingId)
            .select('*, candidate:candidates(name, surname), vacancy:vacancies(title)')
            .single()

          if (!meetErr && meeting) {
            const name = `${meeting.candidate?.name || ''} ${meeting.candidate?.surname || ''}`.trim()
            await editMessageText(
              chatId,
              messageId,
              `✅ <b>Встреча подтверждена!</b>\n\n` +
              `💼 ${meeting.vacancy?.title || 'Вакансия'}\n` +
              `📆 ${formatDateTime(meeting.scheduled_at)}\n\n` +
              `🕐 ${formatDateTime()}`
            )
            await answerCallbackQuery(callbackId, 'Спасибо! Встреча подтверждена ✅')

            // Notify agency
            const agencyChatId = process.env.TELEGRAM_AGENCY_CHAT_ID
            if (agencyChatId) {
              sendMessage(
                agencyChatId,
                `✅ <b>Кандидат ${name} подтвердил встречу</b>\n\n` +
                `💼 ${meeting.vacancy?.title || 'Вакансия'}\n` +
                `📆 ${formatDateTime(meeting.scheduled_at)}\n\n` +
                `🕐 ${formatDateTime()}`
              ).catch(err => console.error('Telegram error:', err))
            }
          } else {
            await answerCallbackQuery(callbackId, 'Встреча не найдена')
          }
        } else {
          await answerCallbackQuery(callbackId, 'БД не настроена')
        }
        return NextResponse.json({ ok: true })
      }

      if (action === 'decline_meeting') {
        const meetingId = applicationId // reuse the split variable
        if (supabase) {
          const { data: meeting, error: meetErr } = await supabase
            .from('meetings')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancel_reason: 'Кандидат отменил',
            })
            .eq('id', meetingId)
            .select('*, candidate:candidates(name, surname), vacancy:vacancies(title)')
            .single()

          if (!meetErr && meeting) {
            const name = `${meeting.candidate?.name || ''} ${meeting.candidate?.surname || ''}`.trim()
            await editMessageText(
              chatId,
              messageId,
              `❌ <b>Встреча отменена</b>\n\n` +
              `💼 ${meeting.vacancy?.title || 'Вакансия'}\n\n` +
              `🕐 ${formatDateTime()}`
            )
            await answerCallbackQuery(callbackId, 'Встреча отменена')

            // Update application status back to approved
            await supabase
              .from('applications')
              .update({ status: 'approved' })
              .eq('id', meeting.application_id)

            // Notify agency
            const agencyChatId = process.env.TELEGRAM_AGENCY_CHAT_ID
            if (agencyChatId) {
              sendMessage(
                agencyChatId,
                `❌ <b>Встреча отменена</b>\n\n` +
                `👤 ${name}\n` +
                `💬 Причина: Кандидат отменил\n\n` +
                `🕐 ${formatDateTime()}`
              ).catch(err => console.error('Telegram error:', err))
            }
          } else {
            await answerCallbackQuery(callbackId, 'Встреча не найдена')
          }
        } else {
          await answerCallbackQuery(callbackId, 'БД не настроена')
        }
        return NextResponse.json({ ok: true })
      }

      if (action === 'approve' || action === 'reject') {
        const newStatus = action === 'approve' ? 'approved' : 'rejected'
        const statusEmoji = action === 'approve' ? '✅' : '❌'
        const statusText = action === 'approve' ? 'ОДОБРЕНО' : 'ОТКЛОНЕНО'

        // Try Supabase first
        if (supabase) {
          const { data: app, error } = await supabase
            .from('applications')
            .update({
              status: newStatus,
              employer_response_at: new Date().toISOString(),
            })
            .eq('id', applicationId)
            .select('*, vacancy:vacancies(*), candidate:candidates(*)')
            .single()

          if (!error && app) {
            await editMessageText(
              chatId,
              messageId,
              `${statusEmoji} <b>${statusText}</b>\n\n` +
              `👤 ${app.candidate?.name} ${app.candidate?.surname}\n` +
              `💼 ${app.vacancy?.title}\n\n` +
              `🕐 ${formatDateTime()}`
            )
            await answerCallbackQuery(callbackId, statusText)
            return NextResponse.json({ ok: true })
          }
        }

        // Fallback: mock store
        const mockApp = getApplicationById(applicationId)
        if (mockApp) {
          updateApplicationStatus(applicationId, newStatus as 'approved' | 'rejected')

          await editMessageText(
            chatId,
            messageId,
            `${statusEmoji} <b>${statusText}</b>\n\nЗаявка ${applicationId}\n\n🕐 ${formatDateTime()}`
          )
          await answerCallbackQuery(callbackId, statusText)
        } else {
          await answerCallbackQuery(callbackId, 'Заявка не найдена')
        }

        return NextResponse.json({ ok: true })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Telegram Webhook] Error:', err)
    return NextResponse.json({ ok: true })
  }
}
