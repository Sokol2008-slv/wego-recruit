import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'
import { signToken } from '@/lib/auth'
import { inngest } from '@/lib/inngest/client'

// Убираем HTML-теги и опасные символы для защиты от XSS
function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim()
}

// Валидация телефона: минимум 7 цифр, допустимые символы
function isValidPhone(phone: unknown): boolean {
  if (typeof phone !== 'string') return false
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

// Обязательные поля формы
const REQUIRED_FIELDS = ['name', 'phone', 'age_range', 'citizenship', 'work_permit', 'country', 'housing_needed', 'start_date', 'schedule', 'couple', 'polish_level', 'restrictions']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Проверка обязательных полей
    for (const field of REQUIRED_FIELDS) {
      const val = body[field]
      if (!val || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
        return NextResponse.json({ error: `Поле "${field}" обязательно` }, { status: 400 })
      }
    }

    // Валидация телефона
    if (!isValidPhone(body.phone)) {
      return NextResponse.json({ error: 'Неверный формат телефона (минимум 7 цифр)' }, { status: 400 })
    }

    // Санитизация текстовых полей от XSS
    const safeName = sanitizeText(body.name)
    const safeSurname = sanitizeText(body.surname)
    const safeLocation = sanitizeText(body.location)
    const safeExtraInfo = sanitizeText(body.extra_info)
    const safeTelegram = sanitizeText(body.telegram)
    const safeRestrictionsComment = sanitizeText(body.restrictions_comment)

    if (!safeName) {
      return NextResponse.json({ error: 'Некорректное имя' }, { status: 400 })
    }

    let candidateId = `temp-${Date.now()}`
    const supabase = getDb()

    if (!supabase) {
      // Без Supabase — генерируем токен и работаем в тестовом режиме
      const token = await signToken({
        candidateId,
        phone: body.phone,
        name: `${safeName} ${safeSurname}`.trim(),
      })

      // Отправляем событие в Inngest (если настроен)
      inngest.send({
        name: "candidate.registered",
        data: { candidate: { id: candidateId, ...body } },
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        token,
        candidateId,
        mode: 'test',
      })
    }

    // Проверка уникальности телефона
    const { data: existingByPhone } = await supabase
      .from('candidates')
      .select('id')
      .eq('phone', body.phone.trim())
      .limit(1)
      .single()

    if (existingByPhone) {
      return NextResponse.json({ error: 'Кандидат с таким телефоном уже зарегистрирован' }, { status: 409 })
    }

    // Проверка уникальности email (если указан)
    if (body.email) {
      const { data: existingByEmail } = await supabase
        .from('candidates')
        .select('id')
        .eq('email', body.email.toLowerCase().trim())
        .limit(1)
        .single()

      if (existingByEmail) {
        return NextResponse.json({ error: 'Кандидат с таким email уже зарегистрирован' }, { status: 409 })
      }
    }

    // Insert candidate into Supabase
    const { data: candidate, error } = await supabase.from('candidates').insert({
      name: safeName,
      surname: safeSurname,
      email: body.email ? body.email.toLowerCase().trim() : null,
      phone: body.phone.trim(),
      telegram: safeTelegram || null,
      has_telegram: body.has_telegram !== false,
      location: safeLocation || null,
      extra_info: safeExtraInfo || null,
      age_range: body.age_range,
      citizenship: body.citizenship,
      work_permit: body.work_permit,
      job_type: body.job_type || [],
      country: body.country,
      housing_needed: body.housing_needed,
      start_date: body.start_date,
      schedule: body.schedule,
      couple: body.couple,
      polish_level: body.polish_level,
      restrictions: body.restrictions,
      restrictions_comment: safeRestrictionsComment || null,
      registered: true,
      source: body.source || 'direct',
      status: 'new',
    }).select().single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Ошибка сохранения данных. Попробуйте ещё раз.' }, { status: 500 })
    }

    // Generate JWT token
    const token = await signToken({
      candidateId: candidate.id,
      phone: body.phone,
      name: `${safeName} ${safeSurname}`.trim(),
    })

    // Save token
    await supabase
      .from('candidates')
      .update({ auth_token: token })
      .eq('id', candidate.id)

    // 🔥 Inngest: отправляем событие — все уведомления обработаются надёжно с retry
    inngest.send({
      name: "candidate.registered",
      data: {
        candidate: {
          id: candidate.id,
          name: safeName,
          surname: safeSurname,
          phone: body.phone,
          telegram: body.telegram,
          telegram_id: body.telegram_id || null,
          age_range: body.age_range,
          citizenship: body.citizenship,
          country: body.country,
          job_type: body.job_type || [],
          start_date: body.start_date,
          schedule: body.schedule,
          restrictions: body.restrictions,
          restrictions_comment: body.restrictions_comment,
          location: body.location,
        },
      },
    }).catch(err => console.error('Inngest send error:', err))

    return NextResponse.json({
      success: true,
      token,
      candidateId: candidate.id,
    })
  } catch (err) {
    console.error('Submit candidate error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
