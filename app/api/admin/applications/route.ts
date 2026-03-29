import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wego2026'

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get('Authorization') || ''
  return auth === `Bearer ${ADMIN_PASSWORD}`
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getDb()
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('applications')
    .select('*, candidate:candidates(id, name, surname, phone, email), vacancy:vacancies(id, title, company, city, country)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ applications: data })
}
