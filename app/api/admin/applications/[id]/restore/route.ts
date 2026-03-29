import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wego2026'

function checkAuth(req: NextRequest): boolean {
  const email = (req.headers.get('X-Admin-Email') || '').toLowerCase().trim()
  const password = req.headers.get('X-Admin-Password') || ''
  return ADMIN_EMAILS.includes(email) && password === ADMIN_PASSWORD
}

// POST — restore a rejected application back to approved
export async function POST(
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

  const { data, error } = await supabase
    .from('applications')
    .update({ status: 'approved' })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  return NextResponse.json({ application: data })
}
