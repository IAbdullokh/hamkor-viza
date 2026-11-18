import type { Dict } from '@/i18n'

/** Sdelkalar page (default dashboard). */
export default {
  // filters
  Davr: ['Период', 'Period'],
  Bugun: ['Сегодня', 'Today'],
  '7 kun': ['7 дней', '7 days'],
  '30 kun': ['30 дней', '30 days'],
  '90 kun': ['90 дней', '90 days'],
  'Butun davr': ['Весь период', 'All time'],
  "Mas'ul": ['Ответственный', 'Owner'],
  Bosqich: ['Стадия', 'Stage'],
  Manba: ['Источник', 'Source'],
  Hammasi: ['Все', 'All'],
  '{n} ta tanlandi': ['Выбрано: {n}', '{n} selected'],
  Qidirish: ['Поиск', 'Search'],
  'Hech narsa topilmadi': ['Ничего не найдено', 'Nothing found'],
  'Istisno (tanlanganlardan tashqari)': ['Исключить (кроме выбранных)', 'Exclude (all but selected)'],
  Istisno: ['Исключение', 'Exclude'],
  Tozalash: ['Сбросить', 'Clear'],

  // stages
  'Yangi / Uchrashuv': ['Новая / Встреча', 'New / Meeting'],
  "Kelishuv bo'ldi": ['Договорились', 'Agreed'],
  'Ish boshlandi': ['Работа начата', 'Work started'],
  "Sotuv bo'ldi": ['Продажа', 'Sold'],
  "Bekor bo'ldi": ['Отменена', 'Cancelled'],

  // sources
  Instagram: ['Instagram', 'Instagram'],
  Facebook: ['Facebook', 'Facebook'],
  Telegram: ['Telegram', 'Telegram'],
  'Veb-sayt': ['Веб-сайт', 'Website'],
  Tavsiya: ['Рекомендация', 'Referral'],
  "Qo'ng'iroq": ['Звонок', 'Call'],

  // reasons
  'Narx qimmat': ['Дорого', 'Too expensive'],
  'Vaqt mos emas': ['Неудобное время', 'Timing does not fit'],
  'Raqobatchini tanladi': ['Выбрал конкурента', 'Chose a competitor'],
  "O'ylab ko'radi": ['Подумает', 'Will think it over'],
  'Manzil uzoq': ['Далеко', 'Too far away'],
  "Noma'lum": ['Неизвестно', 'Unknown'],

  // KPI
  'Jami Sdelkalar': ['Всего сделок', 'Total deals'],
  'Barcha kelishuvlar': ['Все сделки', 'All deals'],
  'Yangi Sdelkalar': ['Новые сделки', 'New deals'],
  Jarayondagi: ['В работе', 'In progress'],
  Muvaffaqiyatli: ['Успешные', 'Successful'],
  "O'rtacha chek": ['Средний чек', 'Average check'],
  "so'm": ['сум', 'UZS'],
  "Sotuv summasi / Sotuv bo'ldi": ['Сумма продаж / Продажи', 'Sales amount / Sold'],
  Konversiya: ['Конверсия', 'Conversion'],
  "Sotuv bo'ldi ÷ jami sdelkalar": ['Продажи ÷ все сделки', 'Sold ÷ all deals'],

  // money
  'Shartnoma summasi': ['Сумма договоров', 'Contract amount'],
  "Bekor bo'lganlardan tashqari barcha sdelkalar summasi": ['Сумма всех сделок, кроме отменённых', 'All deals except cancelled ones'],
  "To'langan": ['Оплачено', 'Paid'],
  "{p} to'landi": ['Оплачено {p}', '{p} paid'],
  'Kutilmoqda (qoldiq)': ['Ожидается (остаток)', 'Outstanding (balance)'],
  "Hali to'lanmagan": ['Ещё не оплачено', 'Not paid yet'],

  // manager table
  'Sdelka va Konversiya': ['Сделки и конверсия', 'Deals and conversion'],
  '{n} ta menejer': ['Менеджеров: {n}', '{n} managers'],
  Menejer: ['Менеджер', 'Manager'],
  'Jami sdelkalar': ['Всего сделок', 'Total deals'],
  Jarayonda: ['В работе', 'In progress'],
  'Shartnoma summa': ['Сумма договоров', 'Contract amount'],
  'Sotuv summa': ['Сумма продаж', 'Sales amount'],
  Jami: ['Итого', 'Total'],
  "Tanlangan davrda ma'lumot yo'q": ['За выбранный период данных нет', 'No data for the selected period'],

  // matrix
  "Sdelka mas'ullar kesimida": ['Сделки по ответственным', 'Deals by owner'],
  "{n} ta xodim · joriy bosqich bo'yicha": ['{n} сотрудников · по текущей стадии', '{n} staff · by current stage'],

  // reasons
  "Bekor bo'lish sabablari": ['Причины отмены', 'Cancellation reasons'],
  "{n} ta bekor bo'lgan sdelka": ['Отменённых сделок: {n}', '{n} cancelled deals'],
  'Menejerlar kesimida': ['По менеджерам', 'By manager'],
  Sabab: ['Причина', 'Reason'],

  // source table
  "Manba bo'yicha": ['По источникам', 'By source'],
  '{n} ta manba': ['Источников: {n}', '{n} sources'],

  // drill
  ID: ['ID', 'ID'],
  Mijoz: ['Клиент', 'Client'],
  Summa: ['Сумма', 'Amount'],
  Sana: ['Дата', 'Date'],
  '{n} ta yozuv': ['{n} записей', '{n} records'],
} satisfies Dict
