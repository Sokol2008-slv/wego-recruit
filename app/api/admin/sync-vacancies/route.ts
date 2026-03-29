import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wego2026'

function checkAuth(req: NextRequest): boolean {
  const email = (req.headers.get('X-Admin-Email') || '').toLowerCase().trim()
  const password = req.headers.get('X-Admin-Password') || ''
  return ADMIN_EMAILS.includes(email) && password === ADMIN_PASSWORD
}

// POST — запустить синхронизацию вакансий вручную
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await inngest.send({
      name: 'vacancies/sync',
      data: { trigger: 'manual' },
    })

    return NextResponse.json({ status: 'triggered', message: 'Синхронизация запущена' })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to trigger sync' }, { status: 500 })
  }
}
