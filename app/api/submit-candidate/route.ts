import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'
import { signToken } from '@/lib/auth'
import { inngest } from '@/lib/inngest/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let candidateId = `temp-${Date.now()}`
    const supabase = getDb()

    if (!supabase) {
      // Без Supabase — генерируем токен и работаем в тестовом режиме
      const token = await signToken({
        candidateId,
        phone: body.phone,
        name: `${body.name} ${body.surname || ''}`.trim(),
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

    // Insert candidate into Supabase
    const { data: candidate, error } = await supabase.from('candidates').insert({
      name: body.name,
      surname: body.surname || '',
      phone: body.phone,
      telegram: body.telegram || null,
      has_telegram: body.has_telegram !== false,
      location: body.location || null,
      extra_info: body.extra_info || null,
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
      restrictions_comment: body.restrictions_comment || null,
      registered: true,
      source: body.source || 'direct',
      status: 'new',
    }).select().single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Generate JWT token
    const token = await signToken({
      candidateId: candidate.id,
      phone: body.phone,
      name: `${body.name} ${body.surname || ''}`.trim(),
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
          name: body.name,
          surname: body.surname || '',
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
