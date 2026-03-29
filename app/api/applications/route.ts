import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { inngest } from '@/lib/inngest/client'

// GET — список заявок текущего кандидата (для дашборда)
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    || req.cookies.get('wego_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('applications')
    .select('*, vacancy:vacancies(*)')
    .eq('candidate_id', payload.candidateId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ applications: data || [] })
}

// POST — подать заявку на вакансию
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    || req.cookies.get('wego_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  try {
    const { vacancyId } = await req.json()

    // Check if already applied
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('candidate_id', payload.candidateId)
      .eq('vacancy_id', vacancyId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already applied' }, { status: 409 })
    }

    // Create application
    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        candidate_id: payload.candidateId,
        vacancy_id: vacancyId,
        status: 'pending',
      })
      .select('*, vacancy:vacancies(*, employer:employers(*))')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 🔥 Inngest: уведомления через очередь с retry
    await inngest.send({
      name: "application.created",
      data: {
        applicationId: application.id,
        candidateId: payload.candidateId,
        vacancyId: vacancyId,
      },
    })

    return NextResponse.json({ application })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
