import type { Dict } from '@/i18n'

/** The date range picker (src/ui/DateRangePicker.tsx) and the Davr bar's "Boshqa davr…" (src/kit/filters.tsx). */
export default {
  Kecha: ['Вчера', 'Yesterday'],
  'Oxirgi 7 kun': ['Последние 7 дней', 'Last 7 days'],
  'Oxirgi 30 kun': ['Последние 30 дней', 'Last 30 days'],
  'Bu chorak': ['Этот квартал', 'This quarter'],
  'Bu yil': ['Этот год', 'This year'],
  "O'tgan yil": ['Прошлый год', 'Last year'],
  'Boshqa davr…': ['Другой период…', 'Custom range…'],
  'Davrni tanlang': ['Выберите период', 'Choose a period'],
  'Boshlanish kunini tanlang': ['Выберите первый день', 'Pick the first day'],
  'Tugash kunini tanlang': ['Теперь выберите последний день', 'Now pick the last day'],
  'Oy va yilni tanlash': ['Выбрать месяц и год', 'Choose month and year'],
  'Oldingi yil': ['Предыдущий год', 'Previous year'],
  'Keyingi yil': ['Следующий год', 'Next year'],
  'Sana yoki davrni yozing': ['Введите дату или период', 'Type a date or a range'],
  'Tez tanlash': ['Быстрый выбор', 'Quick picks'],
} satisfies Dict
