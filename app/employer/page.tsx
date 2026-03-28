'use client'

import { useState } from 'react'
import Nav from '@/components/Nav'

type FormState = {
  company: string
  country: string
  specialty: string
  headcount: string
  start_date: string
  housing: string
  contact: string
  phone: string
  notes: string
}

const initialForm: FormState = {
  company: '',
  country: '',
  specialty: '',
  headcount: '',
  start_date: '',
  housing: '',
  contact: '',
  phone: '',
  notes: '',
}

const countries = ['Польша', 'Германия', 'Чехия', 'Нидерланды', 'Другая']
const specialties = ['Разнорабочие', 'Склад', 'Строители', 'Сварщики', 'Водители', 'Завод', 'Сельхоз', 'Другое']
const housingOptions = ['Предоставляем', 'Сами ищут', 'Обсудим']

export default function EmployerPage() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const set = (key: keyof FormState, val: string) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: false }))
  }

  const required: (keyof FormState)[] = ['company', 'country', 'specialty', 'headcount', 'start_date', 'contact', 'phone']

  const handleSubmit = async () => {
    const newErrors: Record<string, boolean> = {}
    required.forEach(k => {
      if (!form[k].trim()) newErrors[k] = true
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      await fetch('/api/submit-employer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          headcount: parseInt(form.headcount),
        }),
      })
      setSubmitted(true)
    } catch {
      alert('Ошибка при отправке. Попробуйте позже.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <>
        <Nav />
        <main className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="font-display text-4xl text-white mb-3">Заявка принята!</h1>
            <p className="text-muted mb-6">
              Наш менеджер свяжется с вами в течение 24 часов для уточнения деталей.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-blue hover:bg-blue/90 text-white font-medium transition-colors"
            >
              На главную
            </a>
          </div>
        </main>
      </>
    )
  }

  const inputClass = (key: keyof FormState) =>
    `w-full bg-bg2 border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-blue transition-colors ${errors[key] ? 'border-red-500' : 'border-border'}`

  const selectClass = (key: keyof FormState) =>
    `w-full bg-bg2 border rounded-xl px-4 py-3 text-white outline-none focus:border-blue transition-colors appearance-none ${errors[key] ? 'border-red-500' : 'border-border'} ${!form[key] ? 'text-muted/40' : ''}`

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-xl mx-auto">
          <h1 className="font-display text-4xl text-white mb-2">Заявка на подбор персонала</h1>
          <p className="text-muted mb-8">Заполните форму — мы подберём людей под ваши задачи</p>

          {/* О компании */}
          <section className="mb-8">
            <h2 className="text-sm text-blue uppercase tracking-widest mb-4 font-medium">О компании</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted mb-1 block">Название компании *</label>
                <input
                  value={form.company}
                  onChange={e => set('company', e.target.value)}
                  className={inputClass('company')}
                  placeholder="ООО Пример"
                />
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">Страна *</label>
                <select
                  value={form.country}
                  onChange={e => set('country', e.target.value)}
                  className={selectClass('country')}
                >
                  <option value="" disabled>Выберите страну</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Требования */}
          <section className="mb-8">
            <h2 className="text-sm text-blue uppercase tracking-widest mb-4 font-medium">Требования к персоналу</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted mb-1 block">Специальность *</label>
                <select
                  value={form.specialty}
                  onChange={e => set('specialty', e.target.value)}
                  className={selectClass('specialty')}
                >
                  <option value="" disabled>Выберите специальность</option>
                  {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">Количество человек *</label>
                <input
                  type="number"
                  min={1}
                  value={form.headcount}
                  onChange={e => set('headcount', e.target.value)}
                  className={inputClass('headcount')}
                  placeholder="50"
                />
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">Дата начала работы *</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                  className={inputClass('start_date')}
                />
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">Жильё</label>
                <select
                  value={form.housing}
                  onChange={e => set('housing', e.target.value)}
                  className={selectClass('housing')}
                >
                  <option value="" disabled>Выберите вариант</option>
                  {housingOptions.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Контакты */}
          <section className="mb-8">
            <h2 className="text-sm text-blue uppercase tracking-widest mb-4 font-medium">Контакты</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted mb-1 block">Контактное лицо *</label>
                <input
                  value={form.contact}
                  onChange={e => set('contact', e.target.value)}
                  className={inputClass('contact')}
                  placeholder="Иван Иванов"
                />
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">Телефон *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  className={inputClass('phone')}
                  placeholder="+48..."
                />
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">Примечания</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-blue transition-colors resize-none h-24"
                  placeholder="Дополнительная информация..."
                />
              </div>
            </div>
          </section>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-blue hover:bg-blue/90 text-white font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Отправка...' : 'Отправить заявку'}
          </button>
        </div>
      </main>
    </>
  )
}
