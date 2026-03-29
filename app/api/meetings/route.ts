import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

// GET — meetings for current candidate
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

  const supabase = getDb()
  if (!supabase) {
    return NextResponse.json({ meetings: [] })
  }

  const { data, error } = await supabase
    .from('meetings')
    .select('*, vacancy:vacancies(id, title, company, city, country, salary)')
    .eq('candidate_id', payload.candidateId)
    .order('scheduled_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ meetings: data || [] })
}
