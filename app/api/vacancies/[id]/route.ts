import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { MOCK_VACANCIES } from '@/lib/mock-vacancies'

// GET — подробная информация о вакансии
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Supabase
  if (supabase) {
    const { data, error } = await supabase
      .from('vacancies')
      .select('*, employer:employers(*)')
      .eq('id', id)
      .single()

    if (!error && data) {
      return NextResponse.json({ vacancy: data })
    }
  }

  // Fallback: mock data
  const vacancy = MOCK_VACANCIES.find(v => v.id === id)
  if (vacancy) {
    return NextResponse.json({ vacancy })
  }

  return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 })
}

// PATCH — обновить вакансию
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  const { id } = await params

  try {
    const body = await req.json()

    const { data, error } = await supabase
      .from('vacancies')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ vacancy: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
