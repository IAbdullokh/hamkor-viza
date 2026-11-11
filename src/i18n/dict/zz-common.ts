import type { Dict } from '@/i18n'

/**
 * Canonical translations for words shared by several pages. Dict files load alphabetically,
 * so this file loads last and wins — one word, one translation across the whole dashboard.
 */
export default {
  "Mas'ul": ['Ответственный', 'Responsible'],
  Bosqich: ['Этап', 'Stage'],
  Istisno: ['Исключение', 'Exclude'],
  'Istisno (tanlanganlardan tashqari)': ['Исключение (кроме выбранных)', 'Exclude (all but selected)'],
  Tozalash: ['Сбросить', 'Clear'],
  "Sotuv bo'ldi": ['Продажа', 'Sold'],
  "Bekor bo'ldi": ['Отказ', 'Lost'],
  'Bekor qilindi': ['Отказ', 'Lost'],
  "Qo'ng'iroq": ['Звонок', 'Call'],
  'Narx qimmat': ['Дорого', 'Too expensive'],
  'Vaqt mos emas': ['Неудобное время', 'Timing does not fit'],
  'Manzil uzoq': ['Далеко', 'Too far away'],
  'Shartnoma summasi': ['Сумма договоров', 'Contract amount'],
  "O'chirish": ['Удалить', 'Delete'],
  'Uchrashuv belgilandi': ['Встреча назначена', 'Meeting booked'],
  Sifatsiz: ['Некачественный', 'Junk'],
  Yaratilgan: ['Создано', 'Created'],
  'Sifatli lid': ['Качественный лид', 'Qualified lead'],
  'Bir martalik xizmat': ['Разовая услуга', 'One-off service'],
  // in several dicts with different words: the one most screens mean (i18n/coverage.test.ts holds them)
  Kirish: ['Войти', 'Sign in'], // the sign-in button (projects-shell had "Entrance")
  Savdo: ['Продажи', 'Sales'], // the Savdo page (projects-shell had "Retail", meant for the industry)
  Xodimlar: ['Сотрудники', 'Employees'], // Reja staff and the CRM's people (projects-shell had "Users")
  Maqsad: ['Цель', 'Target'], // goal line, Reja and Foizlar targets (projects-shell had "Objective")
} satisfies Dict
