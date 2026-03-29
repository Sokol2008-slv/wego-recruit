import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { inngest } from '@/lib/inngest/client'

// POST — работник выбирает финальную вакансию
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params

  // Verify application belongs to candidate and is approved
  const { data: app, error: appError } = await supabase
    .from('applications')
    .select('id')
    .eq('id', id)
    .eq('candidate_id', payload.candidateId)
    .eq('status', 'approved')
    .single()

  if (appError || !app) {
    return NextResponse.json({ error: 'Application not found or not approved' }, { status: 404 })
  }

  // Mark as selected
  await supabase
    .from('applications')
    .update({
      status: 'selected',
      worker_selected_at: new Date().toISOString(),
    })
    .eq('id', id)

  // 🔥 Inngest: auto-reject + все уведомления через очередь
  await inngest.send({
    name: "application.selected",
    data: {
      applicationId: id,
      candidateId: payload.candidateId,
      candidateName: payload.name,
    },
  })

  return NextResponse.json({ success: true })
}
