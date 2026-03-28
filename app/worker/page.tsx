'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import ProgressBar from '@/components/ProgressBar'
import OptionCard from '@/components/OptionCard'

type StepType = 'single' | 'multi' | 'text'

interface Step {
  key: string
  title: string
  type: StepType
  options?: { label: string; value: string }[]
  hasOther?: boolean
  hasComment?: boolean
  commentTrigger?: string
  commentPlaceholder?: string
  placeholder?: string
  required?: boolean
}

const STEPS: Step[] = [
  {
    key: 'age_range',
    title: 'Ваш возраст',
    type: 'single',
    required: true,
    options: [
      { label: '18–25', value: '18-25' },
      { label: '26–35', value: '26-35' },
      { label: '36–45', value: '36-45' },
      { label: '46–55', value: '46-55' },
    ],
  },
  {
    key: 'citizenship',
    title: 'Страна гражданства?',
    type: 'single',
    required: true,
    hasOther: true,
    options: [
      { label: '🇺🇦 Украина', value: 'ukraine' },
      { label: '🇧🇾 Беларусь', value: 'belarus' },
      { label: '🇲🇩 Молдова', value: 'moldova' },
      { label: '🇱🇹 Литва', value: 'lithuania' },
      { label: '🇱🇻 Латвия', value: 'latvia' },
    ],
  },
  {
    key: 'work_permit',
    title: 'Есть ли разрешение на работу?',
    type: 'single',
    required: true,
    options: [
      { label: 'Да', value: 'yes' },
      { label: 'Нет', value: 'no' },
    ],
  },
  {
    key: 'job_type',
    title: 'На какую работу Вы хотите?',
    type: 'multi',
    required: true,
    options: [
      { label: 'Склад', value: 'warehouse' },
      { label: 'Завод / производство', value: 'factory' },
      { label: 'Упаковка товаров', value: 'packaging' },
      { label: 'Строительство', value: 'construction' },
      { label: 'Уборка', value: 'cleaning' },
      { label: 'Сельское хозяйство', value: 'agriculture' },
      { label: 'Любая работа', value: 'any' },
    ],
  },
  {
    key: 'country',
    title: 'В какой стране готовы работать?',
    type: 'single',
    required: true,
    hasOther: true,
    options: [
      { label: '🇵🇱 Польша', value: 'poland' },
      { label: '🇩🇪 Германия', value: 'germany' },
    ],
  },
  {
    key: 'housing_needed',
    title: 'Нуждаетесь ли Вы в жилье?',
    type: 'single',
    required: true,
    options: [
      { label: 'Да', value: 'yes' },
      { label: 'Нет', value: 'no' },
    ],
  },
  {
    key: 'start_date',
    title: 'Когда готовы начать работу?',
    type: 'single',
    required: true,
    options: [
      { label: 'Срочно', value: 'urgent' },
      { label: 'В течение недели', value: 'week' },
      { label: 'В течение месяца', value: 'month' },
    ],
  },
  {
    key: 'schedule',
    title: 'Какой график работы Вы ищете?',
    type: 'single',
    required: true,
    hasOther: true,
    options: [
      { label: '8 часов', value: '8h' },
      { label: '10 часов', value: '10h' },
      { label: '12 часов', value: '12h' },
    ],
  },
  {
    key: 'couple',
    title: 'Вы ищете работу для семейной пары?',
    type: 'single',
    required: true,
    options: [
      { label: 'Нет, только для себя', value: 'no' },
      { label: 'Да, мы семейная пара', value: 'yes' },
    ],
  },
  {
    key: 'polish_level',
    title: 'Каким уровнем польского языка вы владеете?',
    type: 'single',
    required: true,
    options: [
      { label: 'А1', value: 'A1' },
      { label: 'А2', value: 'A2' },
      { label: 'В1', value: 'B1' },
      { label: 'В2', value: 'B2' },
      { label: 'С1', value: 'C1' },
      { label: 'С2', value: 'C2' },
    ],
  },
  {
    key: 'restrictions',
    title: 'Есть ли ограничения по работе?',
    type: 'single',
    required: true,
    hasComment: true,
    commentTrigger: 'yes',
    commentPlaceholder: 'Например: после операции, нельзя поднимать тяжёлое, работа только сидячая...',
    options: [
      { label: 'Нет', value: 'no' },
      { label: 'Да', value: 'yes' },
    ],
  },
  {
    key: 'location',
    title: 'Где Вы сейчас находитесь?',
    type: 'text',
    required: true,
    placeholder: 'Город, страна',
  },
]

type Phase = 'form' | 'contacts'

export default function WorkerPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<Phase>('form')
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [multiData, setMultiData] = useState<Record<string, string[]>>({})
  const [otherText, setOtherText] = useState<Record<string, string>>({})
  const [contacts, setContacts] = useState({
    name: '',
    surname: '',
    phone: '',
    telegram: '',
  })
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  const totalSteps = STEPS.length + 1
  const currentProgress = phase === 'form' ? step + 1 : totalSteps

  const animate = () => setAnimKey(k => k + 1)

  const currentStep = STEPS[step]

  // Single select
  const selectOption = (value: string) => {
    setFormData(prev => ({ ...prev, [currentStep.key]: value }))
    // Clear other text if not selecting "other"
    if (value !== 'other') {
      setOtherText(prev => ({ ...prev, [currentStep.key]: '' }))
    }
    // Don't auto-advance if "other" selected or comment trigger selected
    const needsInput = value === 'other'
      || (currentStep.hasComment && value === currentStep.commentTrigger)
    if (!needsInput) {
      animate()
      setTimeout(() => advanceStep(), 200)
    }
  }

  // Multi select toggle
  const toggleMulti = (value: string) => {
    setMultiData(prev => {
      const current = prev[currentStep.key] || []
      if (current.includes(value)) {
        return { ...prev, [currentStep.key]: current.filter(v => v !== value) }
      }
      return { ...prev, [currentStep.key]: [...current, value] }
    })
  }

  // Text input for text-type steps
  const setTextValue = (value: string) => {
    setFormData(prev => ({ ...prev, [currentStep.key]: value }))
  }

  const advanceStep = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      setPhase('contacts')
    }
  }

  const handleNext = () => {
    const s = STEPS[step]

    if (s.type === 'multi') {
      const selected = multiData[s.key] || []
      if (s.required && selected.length === 0) return
    } else if (s.type === 'text') {
      if (s.required && !formData[s.key]?.trim()) return
    } else {
      // single
      if (s.required && !formData[s.key]) return
      if (formData[s.key] === 'other' && !otherText[s.key]?.trim()) return
      if (s.hasComment && formData[s.key] === s.commentTrigger && !otherText[s.key]?.trim()) return
    }

    animate()
    setTimeout(() => advanceStep(), 100)
  }

  const goBack = () => {
    animate()
    if (phase === 'form' && step > 0) setStep(s => s - 1)
    else if (phase === 'contacts') {
      setPhase('form')
      setStep(STEPS.length - 1)
    }
  }

  // Submit
  const handleSubmit = async () => {
    const newErrors: Record<string, boolean> = {}
    if (!contacts.name.trim()) newErrors.name = true
    if (!contacts.surname.trim()) newErrors.surname = true
    const cleanPhone = contacts.phone.replace(/[\s\-()]/g, '')
    if (!cleanPhone.startsWith('+') || !/^\+\d{9,15}$/.test(cleanPhone)) newErrors.phone = true
    if (!contacts.telegram.trim() || !contacts.telegram.trim().startsWith('@')) newErrors.telegram = true
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      // Build final data
      const finalData: Record<string, unknown> = {}
      STEPS.forEach(s => {
        if (s.type === 'multi') {
          finalData[s.key] = multiData[s.key] || []
        } else if (formData[s.key] === 'other') {
          finalData[s.key] = otherText[s.key] || 'other'
        } else {
          finalData[s.key] = formData[s.key]
        }
        if (s.hasComment && formData[s.key] === s.commentTrigger && otherText[s.key]) {
          finalData[s.key + '_comment'] = otherText[s.key]
        }
      })

      const body = {
        ...finalData,
        name: contacts.name + ' ' + contacts.surname,
        phone: contacts.phone,
        telegram: contacts.telegram,
      }
      await fetch('/api/submit-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      router.push('/vacancies')
    } catch {
      alert('Ошибка при отправке. Попробуйте позже.')
    } finally {
      setSubmitting(false)
    }
  }

  // Check if "Далее" button should be shown
  const showNextButton = currentStep?.type === 'multi'
    || currentStep?.type === 'text'
    || (currentStep?.type === 'single' && formData[currentStep.key] === 'other')
    || (currentStep?.hasComment && formData[currentStep.key] === currentStep.commentTrigger)

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-lg mx-auto">
          <ProgressBar current={currentProgress} total={totalSteps} />

          <div key={animKey} className="animate-fadeUp">
            {/* FORM PHASE */}
            {phase === 'form' && (
              <>
                <h2 className="font-display text-3xl text-white mb-6">
                  {currentStep.title}
                </h2>

                {/* SINGLE SELECT */}
                {currentStep.type === 'single' && (
                  <div className="space-y-3">
                    {currentStep.options!.map(opt => (
                      <OptionCard
                        key={opt.value}
                        label={opt.label}
                        selected={formData[currentStep.key] === opt.value}
                        onClick={() => selectOption(opt.value)}
                      />
                    ))}
                    {currentStep.hasOther && (
                      <>
                        <OptionCard
                          label="Другое"
                          selected={formData[currentStep.key] === 'other'}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, [currentStep.key]: 'other' }))
                          }}
                        />
                        {formData[currentStep.key] === 'other' && (
                          <input
                            autoFocus
                            value={otherText[currentStep.key] || ''}
                            onChange={e => setOtherText(prev => ({ ...prev, [currentStep.key]: e.target.value }))}
                            className="w-full bg-bg2 border border-accent/50 rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-accent transition-colors"
                            placeholder="Укажите..."
                          />
                        )}
                      </>
                    )}
                    {currentStep.hasComment && formData[currentStep.key] === currentStep.commentTrigger && (
                      <textarea
                        autoFocus
                        value={otherText[currentStep.key] || ''}
                        onChange={e => setOtherText(prev => ({ ...prev, [currentStep.key]: e.target.value }))}
                        className="w-full bg-bg2 border border-accent/50 rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-accent transition-colors resize-none"
                        placeholder={currentStep.commentPlaceholder || 'Укажите...'}
                        rows={3}
                      />
                    )}
                  </div>
                )}

                {/* MULTI SELECT */}
                {currentStep.type === 'multi' && (
                  <div className="space-y-3">
                    <p className="text-muted text-sm -mt-4 mb-4">Можно выбрать несколько вариантов</p>
                    {currentStep.options!.map(opt => (
                      <OptionCard
                        key={opt.value}
                        label={opt.label}
                        checkbox
                        selected={(multiData[currentStep.key] || []).includes(opt.value)}
                        onClick={() => toggleMulti(opt.value)}
                      />
                    ))}
                  </div>
                )}

                {/* TEXT INPUT */}
                {currentStep.type === 'text' && (
                  <input
                    autoFocus
                    value={formData[currentStep.key] || ''}
                    onChange={e => setTextValue(e.target.value)}
                    className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-accent transition-colors"
                    placeholder={currentStep.placeholder || ''}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && formData[currentStep.key]?.trim()) handleNext()
                    }}
                  />
                )}

                {/* Далее button for multi, text, and "other" */}
                {showNextButton && (
                  <button
                    onClick={handleNext}
                    className="w-full py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-medium transition-colors mt-6"
                  >
                    Далее →
                  </button>
                )}
              </>
            )}

            {/* CONTACTS PHASE */}
            {phase === 'contacts' && (
              <>
                <h2 className="font-display text-3xl text-white mb-2">Контактные данные</h2>
                <p className="text-muted text-sm mb-6">Мы свяжемся с вами для подбора вакансий</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted mb-1 block">Имя (латиницей) *</label>
                      <input
                        value={contacts.name}
                        onChange={e => {
                          setContacts(c => ({ ...c, name: e.target.value }))
                          setErrors(e2 => ({ ...e2, name: false }))
                        }}
                        className={`w-full bg-bg2 border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-accent transition-colors ${errors.name ? 'border-red-500' : 'border-border'}`}
                        placeholder="Ivan"
                      />
                      {errors.name && <p className="text-red-500 text-xs mt-1">Обязательное поле</p>}
                    </div>
                    <div>
                      <label className="text-sm text-muted mb-1 block">Фамилия (латиницей) *</label>
                      <input
                        value={contacts.surname}
                        onChange={e => {
                          setContacts(c => ({ ...c, surname: e.target.value }))
                          setErrors(e2 => ({ ...e2, surname: false }))
                        }}
                        className={`w-full bg-bg2 border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-accent transition-colors ${errors.surname ? 'border-red-500' : 'border-border'}`}
                        placeholder="Petrov"
                      />
                      {errors.surname && <p className="text-red-500 text-xs mt-1">Обязательное поле</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted mb-1 block">Номер телефона *</label>
                    <input
                      value={contacts.phone}
                      onChange={e => {
                        setContacts(c => ({ ...c, phone: e.target.value }))
                        setErrors(e2 => ({ ...e2, phone: false }))
                      }}
                      className={`w-full bg-bg2 border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-accent transition-colors ${errors.phone ? 'border-red-500' : 'border-border'}`}
                      placeholder="+380 XX XXX XX XX"
                      type="tel"
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">Введите номер с + и кодом страны (например +380...)</p>}
                  </div>
                  <div>
                    <label className="text-sm text-muted mb-1 block">Telegram *</label>
                    <input
                      value={contacts.telegram}
                      onChange={e => {
                        setContacts(c => ({ ...c, telegram: e.target.value }))
                        setErrors(e2 => ({ ...e2, telegram: false }))
                      }}
                      className={`w-full bg-bg2 border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-accent transition-colors ${errors.telegram ? 'border-red-500' : 'border-border'}`}
                      placeholder="@username"
                    />
                    {errors.telegram && <p className="text-red-500 text-xs mt-1">Введите ник в формате @username</p>}
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-medium transition-colors disabled:opacity-50 mt-4"
                  >
                    {submitting ? 'Отправка...' : 'Отправить анкету'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Back button */}
          {(step > 0 || phase !== 'form') && (
            <button
              onClick={goBack}
              className="mt-6 text-sm text-muted hover:text-white transition-colors flex items-center gap-1"
            >
              &larr; Назад
            </button>
          )}
        </div>
      </main>
    </>
  )
}
