// Telegram Bot API helper
// Бот отправляет уведомления рекрутёрам WEGO и работодателям
// Работники получают уведомления ЧЕРЕЗ САЙТ (Telegram — опционально)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const AGENCY_CHAT_ID = process.env.TELEGRAM_AGENCY_CHAT_ID || ''
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`

export function formatDateTime(date?: Date | string): string {
  const d = date ? new Date(date) : new Date()
  return d.toLocaleString('ru-RU', {
    timeZone: 'Europe/Warsaw',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

type InlineButton = {
  text: string
  callback_data: string
}

// === БАЗОВЫЕ МЕТОДЫ ===

export async function sendMessage(chatId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  if (!BOT_TOKEN) {
    console.log('[Telegram] No bot token, skipping message to', chatId)
    return null
  }

  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    })
    return await res.json()
  } catch (err) {
    console.error('[Telegram] sendMessage error:', err)
    return null
  }
}

export async function sendMessageWithButtons(
  chatId: string,
  text: string,
  buttons: InlineButton[][],
  parseMode: 'HTML' | 'Markdown' = 'HTML'
) {
  if (!BOT_TOKEN) {
    console.log('[Telegram] No bot token, skipping message with buttons to', chatId)
    return null
  }

  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        reply_markup: {
          inline_keyboard: buttons,
        },
      }),
    })
    return await res.json()
  } catch (err) {
    console.error('[Telegram] sendMessageWithButtons error:', err)
    return null
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  if (!BOT_TOKEN) return null

  try {
    const res = await fetch(`${API_BASE}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    })
    return await res.json()
  } catch (err) {
    console.error('[Telegram] answerCallbackQuery error:', err)
    return null
  }
}

export async function editMessageText(chatId: string, messageId: number, text: string) {
  if (!BOT_TOKEN) return null

  try {
    const res = await fetch(`${API_BASE}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
      }),
    })
    return await res.json()
  } catch (err) {
    console.error('[Telegram] editMessageText error:', err)
    return null
  }
}

// === УВЕДОМЛЕНИЯ ===

// Рекрутёру WEGO: новый кандидат зарегистрировался
export async function notifyAgencyNewCandidate(candidate: {
  name: string
  surname: string
  phone: string
  telegram?: string | null
  age_range: string
  citizenship: string
  country: string
  job_type: string[]
  start_date: string
  schedule: string
  restrictions: string
  restrictions_comment?: string | null
  location?: string
}) {
  if (!AGENCY_CHAT_ID) return

  const text = `🆕 <b>Новый кандидат зарегистрировался!</b>

👤 <b>${candidate.name} ${candidate.surname}</b>
📞 ${candidate.phone}
${candidate.telegram ? `💬 @${candidate.telegram.replace('@', '')}` : '❌ Telegram отсутствует'}

📋 <b>Анкета:</b>
• Возраст: ${candidate.age_range}
• Гражданство: ${candidate.citizenship}
• Страна работы: ${candidate.country}
• Тип работы: ${candidate.job_type.join(', ')}
• Начало: ${candidate.start_date}
• График: ${candidate.schedule}
• Ограничения: ${candidate.restrictions}${candidate.restrictions_comment ? ` (${candidate.restrictions_comment})` : ''}
${candidate.location ? `• Находится: ${candidate.location}` : ''}

🕐 ${formatDateTime()}`

  return sendMessage(AGENCY_CHAT_ID, text)
}

// Рекрутёру WEGO: кандидат подал заявку на вакансию
export async function notifyAgencyNewApplication(
  candidateName: string,
  vacancyTitle: string,
  company: string
) {
  if (!AGENCY_CHAT_ID) return

  const text = `📩 <b>Новая заявка!</b>

👤 ${candidateName} подал заявку на:
💼 <b>${vacancyTitle}</b> — ${company}

🕐 ${formatDateTime()}`

  return sendMessage(AGENCY_CHAT_ID, text)
}

// Работодателю: к вам хочет устроиться кандидат
export async function notifyEmployerNewApplication(
  employerChatId: string,
  applicationId: string,
  candidate: { name: string; surname: string; phone: string; age_range: string },
  vacancyTitle: string
) {
  const text = `📩 <b>Новая заявка на вакансию!</b>

💼 Вакансия: <b>${vacancyTitle}</b>

👤 Кандидат: <b>${candidate.name} ${candidate.surname}</b>
📞 ${candidate.phone}
• Возраст: ${candidate.age_range}

🕐 ${formatDateTime()}`

  return sendMessageWithButtons(employerChatId, text, [
    [
      { text: '✅ Есть места', callback_data: `approve:${applicationId}` },
      { text: '❌ Нет мест', callback_data: `reject:${applicationId}` },
    ],
  ])
}

// Работнику (если есть Telegram): статус заявки изменился
export async function notifyWorkerApplicationStatus(
  telegramUsername: string | null,
  vacancyTitle: string,
  status: 'approved' | 'rejected'
) {
  // Telegram-уведомления работнику — только если есть username
  // Основной канал — сайт (дашборд)
  if (!telegramUsername) return

  // Примечание: для отправки по username нужен chat_id
  // Пока логируем — в будущем можно добавить telegram_id
  console.log(`[Telegram] Would notify worker @${telegramUsername}: ${vacancyTitle} -> ${status}`)
}

// Работодателю: работник выбрал другую компанию
export async function notifyEmployerAutoRejected(
  employerChatId: string,
  candidateName: string,
  vacancyTitle: string
) {
  const text = `ℹ️ Кандидат <b>${candidateName}</b> выбрал другую вакансию.

Вакансия: ${vacancyTitle}

🕐 ${formatDateTime()}`

  return sendMessage(employerChatId, text)
}

// Рекрутёру: работник сделал финальный выбор
export async function notifyAgencyWorkerSelected(
  candidateName: string,
  vacancyTitle: string,
  company: string
) {
  if (!AGENCY_CHAT_ID) return

  const text = `🎯 <b>Работник сделал выбор!</b>

👤 ${candidateName} выбрал:
💼 <b>${vacancyTitle}</b> — ${company}

🕐 ${formatDateTime()}`

  return sendMessage(AGENCY_CHAT_ID, text)
}

// === НАСТРОЙКА WEBHOOK ===

export async function setWebhook(url: string) {
  if (!BOT_TOKEN) return null

  const res = await fetch(`${API_BASE}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  return await res.json()
}
