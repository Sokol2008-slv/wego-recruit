import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wego2026'

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get('Authorization') || ''
  return auth === `Bearer ${ADMIN_PASSWORD}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getDb()
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  const { id } = await params

  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single()

  if (candidateError || !candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }

  const { data: applications, error: appsError } = await supabase
    .from('applications')
    .select('*, vacancy:vacancies(id, title, company, city, country, salary)')
    .eq('candidate_id', id)
    .order('created_at', { ascending: false })

  if (appsError) {
    return NextResponse.json({ error: appsError.message }, { status: 500 })
  }

  return NextResponse.json({ candidate, applications: applications || [] })
}
