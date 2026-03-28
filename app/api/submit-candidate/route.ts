import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { error } = await supabase.from('candidates').insert({
      name: body.name,
      phone: body.phone,
      location: body.location || null,
      extra_info: body.extra_info || null,
      age_range: body.age_range,
      citizenship: body.citizenship,
      work_permit: body.work_permit === 'yes',
      job_type: body.job_type,
      country: body.country,
      housing_needed: body.housing_needed === 'yes',
      start_date: body.start_date,
      schedule: body.schedule,
      couple: body.couple === 'yes',
      polish_level: body.polish_level,
      restrictions: body.restrictions === 'yes',
      category: 'blue_collar',
      source: 'direct',
      status: 'new',
    })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Optional N8N webhook
    const webhookUrl = process.env.N8N_WEBHOOK_URL
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_candidate', data: body }),
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
