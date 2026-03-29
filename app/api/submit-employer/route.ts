import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const supabase = getDb()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { error } = await supabase.from('employer_requests').insert({
      company: body.company,
      country: body.country,
      specialty: body.specialty,
      headcount: body.headcount,
      start_date: body.start_date || null,
      housing_provided: body.housing || null,
      contact_name: body.contact,
      phone: body.phone,
      notes: body.notes || null,
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
        body: JSON.stringify({ type: 'new_employer_request', data: body }),
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
