import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/supabase'
import { MOCK_VACANCIES } from '@/lib/mock-vacancies'

// GET — список активных вакансий
export async function GET() {
  const supabase = getDb()
  if (!supabase) {
    console.log('Supabase not configured, URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING')
    return NextResponse.json({ vacancies: MOCK_VACANCIES })
  }

  const { data, error } = await supabase
    .from('vacancies')
    .select('*')
    .eq('active', true)
    .eq('category', 'blue_collar')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase vacancies error:', error)
    return NextResponse.json({ vacancies: MOCK_VACANCIES })
  }

  return NextResponse.json({ vacancies: data && data.length > 0 ? data : MOCK_VACANCIES })
}

// POST — создать вакансию
export async function POST(req: NextRequest) {
  const supabase = getDb()
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()

    const { data, error } = await supabase.from('vacancies').insert({
      title: body.title,
      company: body.company,
      country: body.country,
      city: body.city,
      salary: body.salary || null,
      housing: body.housing || false,
      schedule: body.schedule || null,
      description: body.description || null,
      requirements: body.requirements || null,
      departure_options: body.departure_options || [],
      tags: body.tags || [],
      headcount: body.headcount || 1,
      employer_id: body.employer_id || null,
      active: true,
      category: body.category || 'blue_collar',
    }).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ vacancy: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
