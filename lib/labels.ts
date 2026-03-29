// Маппинг значений анкеты на русские подписи
export const FIELD_LABELS: Record<string, Record<string, string>> = {
  age_range: {
    '18-25': '18–25',
    '26-35': '26–35',
    '36-45': '36–45',
    '46-55': '46–55',
  },
  citizenship: {
    ukraine: '🇺🇦 Украина',
    belarus: '🇧🇾 Беларусь',
    moldova: '🇲🇩 Молдова',
    lithuania: '🇱🇹 Литва',
    latvia: '🇱🇻 Латвия',
  },
  work_permit: {
    yes: 'Да',
    no: 'Нет',
  },
  job_type: {
    warehouse: 'Склад',
    factory: 'Завод / производство',
    packaging: 'Упаковка товаров',
    construction: 'Строительство',
    cleaning: 'Уборка',
    agriculture: 'Сельское хозяйство',
    any: 'Любая работа',
  },
  country: {
    poland: '🇵🇱 Польша',
    germany: '🇩🇪 Германия',
  },
  housing_needed: {
    yes: 'Да',
    no: 'Нет',
  },
  start_date: {
    urgent: 'Срочно',
    week: 'В течение недели',
    month: 'В течение месяца',
  },
  schedule: {
    '8h': '8 часов',
    '10h': '10 часов',
    '12h': '12 часов',
  },
  couple: {
    yes: 'Да, семейная пара',
    no: 'Нет, только для себя',
  },
  polish_level: {
    none: 'Не говорю',
    A1: 'A1 — Базовый',
    A2: 'A2',
    B1: 'B1',
    B2: 'B2',
  },
  restrictions: {
    yes: 'Да',
    no: 'Нет',
  },
  status: {
    new: 'Новый',
    contacted: 'Связались',
    hired: 'Нанят',
    rejected: 'Отклонён',
  },
}

export function translateValue(field: string, value: string | string[] | undefined | null): string {
  if (!value) return '—'
  if (Array.isArray(value)) {
    return value.map(v => FIELD_LABELS[field]?.[v] || v).join(', ')
  }
  return FIELD_LABELS[field]?.[value] || value
}
