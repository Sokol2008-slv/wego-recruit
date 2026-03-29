import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Тестовые вакансии (пока нет Supabase)
const MOCK_VACANCIES = [
  {
    id: 'test-1',
    created_at: '2026-03-28',
    title: 'Разнорабочий на завод',
    company: 'PolPak Sp. z o.o.',
    country: 'Польша',
    city: 'Варшава',
    salary: '4 200 – 5 000 PLN/мес',
    housing: true,
    schedule: '8 часов, пн-пт',
    description: 'Работа на производственной линии. Упаковка и сортировка продукции. Стабильный график, дружный коллектив. Обучение на месте.',
    requirements: 'Возраст 18-55 лет. Готовность к физическому труду. Документы в порядке.',
    departure_options: ['Через 3 дня'],
    tags: ['Завод', '18–55'],
    headcount: 30,
    active: true,
    category: 'blue_collar',
  },
  {
    id: 'test-2',
    created_at: '2026-03-27',
    title: 'Сортировщик на складе',
    company: 'Amazon Logistics',
    country: 'Польша',
    city: 'Вроцлав',
    salary: '4 500 – 5 200 PLN/мес',
    housing: true,
    schedule: '12 часов, 2/2',
    description: 'Сортировка и комплектация заказов на современном складе. Тёплое помещение, бесплатные обеды. Возможность сверхурочных.',
    requirements: 'Без опыта. Возраст 18-50. Физическая выносливость.',
    departure_options: ['Через неделю'],
    tags: ['Склад', '18–50'],
    headcount: 100,
    active: true,
    category: 'blue_collar',
  },
  {
    id: 'test-3',
    created_at: '2026-03-26',
    title: 'Строитель-универсал',
    company: 'BauGruppe GmbH',
    country: 'Германия',
    city: 'Берлин',
    salary: '2 800 – 3 500 EUR/мес',
    housing: false,
    schedule: '8 часов, пн-пт',
    description: 'Строительные работы на объектах в Берлине. Кладка, штукатурка, общестроительные работы.',
    requirements: 'Опыт от 1 года. Возраст 25-50. Базовый английский или немецкий.',
    departure_options: ['Через 2 недели'],
    tags: ['Стройка', '25–50', 'Опыт'],
    headcount: 15,
    active: true,
    category: 'blue_collar',
  },
  {
    id: 'test-4',
    created_at: '2026-03-25',
    title: 'Упаковщик мясной продукции',
    company: 'Drobimex S.A.',
    country: 'Польша',
    city: 'Щецин',
    salary: '4 000 – 4 800 PLN/мес',
    housing: true,
    schedule: '10 часов, 5/2',
    description: 'Упаковка и маркировка мясной продукции. Работа в чистом цеху при температуре +5°C. Спецодежда предоставляется.',
    requirements: 'Без опыта. Медицинская книжка. Возраст 18-55.',
    departure_options: ['Через 3 дня'],
    tags: ['Завод', '18–55'],
    headcount: 50,
    active: true,
    category: 'blue_collar',
  },
  {
    id: 'test-5',
    created_at: '2026-03-24',
    title: 'Сварщик MIG/MAG',
    company: 'MetallBau AG',
    country: 'Германия',
    city: 'Мюнхен',
    salary: '3 200 – 4 000 EUR/мес',
    housing: true,
    schedule: '8 часов, пн-пт',
    description: 'Сварочные работы на производстве металлоконструкций. Современное оборудование. Официальное трудоустройство.',
    requirements: 'Сертификат сварщика MIG/MAG. Опыт от 2 лет. Возраст 25-50.',
    departure_options: ['Через месяц'],
    tags: ['Сварка', '25–50', 'Сертификат'],
    headcount: 8,
    active: true,
    category: 'blue_collar',
  },
  {
    id: 'test-6',
    created_at: '2026-03-23',
    title: 'Рабочий на ферму',
    company: 'Agro-Farm Sp. z o.o.',
    country: 'Польша',
    city: 'Люблин',
    salary: '3 800 – 4 500 PLN/мес',
    housing: true,
    schedule: '8-10 часов, 6/1',
    description: 'Сельскохозяйственные работы: сбор урожая, уход за растениями, работа в теплицах. Проживание на территории фермы.',
    requirements: 'Без опыта. Возможна работа для семейных пар. Возраст 18-55.',
    departure_options: ['Через неделю'],
    tags: ['Сельхоз', 'Пары'],
    headcount: 40,
    active: true,
    category: 'blue_collar',
  },
]

// GET — список активных вакансий
export async function GET() {
  // Если Supabase подключён — берём из БД
  if (supabase) {
    const { data, error } = await supabase
      .from('vacancies')
      .select('*')
      .eq('active', true)
      .eq('category', 'blue_collar')
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      return NextResponse.json({ vacancies: data })
    }
  }

  // Fallback: тестовые данные
  return NextResponse.json({ vacancies: MOCK_VACANCIES })
}

// POST — создать вакансию (для рекрутёра/админа)
export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured — using mock data' }, { status: 500 })
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
