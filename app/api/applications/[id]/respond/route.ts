import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'

// POST — работодатель одобряет/отклоняет заявку
// Вызывается из Telegram webhook (callback кнопки) или напрямую
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getDb()
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  const { id } = await params

  try {
    const { action } = await req.json() // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { data, error } = await supabase
      .from('applications')
      .update({
        status: newStatus,
        employer_response_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, vacancy:vacancies(*), candidate:candidates(*)')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json({ application: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
