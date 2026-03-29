import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  sendMessage,
  answerCallbackQuery,
  editMessageText,
  notifyWorkerApplicationStatus,
  notifyAgencyWorkerSelected,
} from '@/lib/telegram'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://recruit-starter.vercel.app'

export async function POST(req: NextRequest) {
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
        `<a href="${SITE_URL}/worker">${SITE_URL}/worker</a>`
      )
      return NextResponse.json({ ok: true })
    }

    // Handle callback queries (employer approve/reject)
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

      if (action === 'approve' || action === 'reject') {
        if (!supabase) {
          await answerCallbackQuery(callbackId, 'Ошибка базы данных')
          return NextResponse.json({ ok: true })
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected'

        // Update application status
        const { data: app, error } = await supabase
          .from('applications')
          .update({
            status: newStatus,
            employer_response_at: new Date().toISOString(),
          })
          .eq('id', applicationId)
          .select('*, vacancy:vacancies(*), candidate:candidates(*)')
          .single()

        if (error || !app) {
          await answerCallbackQuery(callbackId, 'Заявка не найдена')
          return NextResponse.json({ ok: true })
        }

        // Edit the original message to show result
        const statusEmoji = action === 'approve' ? '✅' : '❌'
        const statusText = action === 'approve' ? 'ОДОБРЕНО' : 'ОТКЛОНЕНО'
        await editMessageText(
          chatId,
          messageId,
          `${statusEmoji} <b>${statusText}</b>\n\n` +
          `👤 ${app.candidate?.name} ${app.candidate?.surname}\n` +
          `💼 ${app.vacancy?.title}`
        )

        await answerCallbackQuery(callbackId, statusText)

        // Notify worker via Telegram (if has username)
        if (app.candidate?.telegram) {
          await notifyWorkerApplicationStatus(
            app.candidate.telegram,
            app.vacancy?.title || 'Вакансия',
            newStatus as 'approved' | 'rejected'
          )
        }
      }

      if (action === 'no_slots') {
        // Employer says no more slots — deactivate vacancy, reject all pending
        if (!supabase) {
          await answerCallbackQuery(callbackId, 'Ошибка')
          return NextResponse.json({ ok: true })
        }

        // Get the application to find vacancy
        const { data: app } = await supabase
          .from('applications')
          .select('vacancy_id, vacancy:vacancies(title)')
          .eq('id', applicationId)
          .single()

        if (app?.vacancy_id) {
          // Deactivate vacancy
          await supabase
            .from('vacancies')
            .update({ active: false })
            .eq('id', app.vacancy_id)

          // Reject all pending applications for this vacancy
          await supabase
            .from('applications')
            .update({ status: 'rejected', employer_response_at: new Date().toISOString() })
            .eq('vacancy_id', app.vacancy_id)
            .eq('status', 'pending')
        }

        await editMessageText(chatId, messageId, `🚫 Вакансия закрыта (мест нет)`)
        await answerCallbackQuery(callbackId, 'Вакансия закрыта')
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Telegram Webhook] Error:', err)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}
