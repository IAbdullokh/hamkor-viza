import type { Dict } from '@/i18n'

export default {
  // filters
  Kampaniya: ['Кампания', 'Campaign'],
  Platforma: ['Платформа', 'Platform'],
  Forma: ['Форма', 'Form'],
  Adset: ['Адсет', 'Ad set'],
  'Creative nomi': ['Название креатива', 'Creative name'],
  "Noma'lum creative": ['Креатив не указан', 'Creative unknown'],
  'Reklamani ochish': ['Открыть рекламу', 'Open the ad'],
  'Forma yoki kampaniya nomi orqali qidiring...': ['Поиск по названию формы или кампании...', 'Search by form or campaign name...'],
  Qidirish: ['Поиск', 'Search'],

  // KPI row 1
  'Jami lidlar': ['Всего лидов', 'Total leads'],
  'Forma lidlari': ['Лиды из форм', 'Form leads'],
  'Sifatli lidlar': ['Качественные лиды', 'Qualified leads'],
  'Forma sifatlilar': ['Качественные из форм', 'Qualified from forms'],
  Sotuv: ['Продажи', 'Sales'],
  'Forma lidlaridan sotuvlar': ['Продажи из лидов форм', 'Sales from form leads'],
  "UTM to'ldirilmagan": ['Без UTM', 'UTM missing'],
  'FB forma topilmagan sotuvlar': ['Продажи без FB-формы', 'Sales with no FB form'],

  // KPI row 2
  'Jami sarf': ['Общий расход', 'Total spend'],
  'Meta Ads sarfi': ['Расход Meta Ads', 'Meta Ads spend'],
  'Sifatli lid narxi': ['Цена качественного лида', 'Cost per qualified lead'],
  'Byudjet ÷ Sifatli lidlar': ['Бюджет ÷ Качественные лиды', 'Budget ÷ Qualified leads'],
  'Mijoz narxi': ['Цена клиента', 'Cost per customer'],
  'Byudjet ÷ Sotuvlar soni': ['Бюджет ÷ Число продаж', 'Budget ÷ Number of sales'],

  // KPI row 3
  Impressiyalar: ['Показы', 'Impressions'],
  "Jami ko'rishlar": ['Всего показов', 'Total views'],
  'Click narxi (CPC)': ['Цена клика (CPC)', 'Cost per click (CPC)'],
  'Cost per click': ['Цена за клик', 'Cost per click'],
  'Lead narxi (CPL)': ['Цена лида (CPL)', 'Cost per lead (CPL)'],
  'Cost per lead': ['Цена за лид', 'Cost per lead'],

  // tabs + card headers
  Kampaniyalar: ['Кампании', 'Campaigns'],
  'Faol formalar': ['Активные формы', 'Active forms'],
  "Lidlar ro'yxati": ['Список лидов', 'Lead list'],
  Creative: ['Креатив', 'Creative'],
  'Lead Form Performance': ['Эффективность лид-форм', 'Lead Form Performance'],
  'Creative Performance': ['Эффективность креативов', 'Creative Performance'],
  "Faol formalar bo'yicha real vaqtdagi ko'rsatkichlar": ['Показатели активных форм в реальном времени', 'Real-time metrics of active forms'],
  "Meta Ads ma'lumotlari": ['Данные Meta Ads', 'Meta Ads data'],
  'CSV yuklab olish': ['Скачать CSV', 'Download CSV'],

  // table columns
  Sarf: ['Расход', 'Spend'],
  'Jami lid': ['Всего лидов', 'Total leads'],
  Sifatli: ['Качественные', 'Qualified'],
  Sifatsiz: ['Некачественный', 'Junk'],
  Bekor: ['Отменено', 'Cancelled'],
  'Sifat %': ['Качество %', 'Quality %'],
  'Forma nomi': ['Название формы', 'Form name'],
  Holat: ['Статус', 'Status'],
  FAOL: ['АКТИВНА', 'ACTIVE'],
  "TO'XTATILGAN": ['ОСТАНОВЛЕНА', 'PAUSED'],
  Kliklar: ['Клики', 'Clicks'],
  CPC: ['CPC', 'CPC'],
  'Lidlar (jami)': ['Лиды (всего)', 'Leads (total)'],
  'Sifatli lid': ['Качественный лид', 'Qualified lead'],
  'Meta lidlar': ['Лиды Meta', 'Meta leads'],
  Bitrix24: ['Bitrix24', 'Bitrix24'],
  "Sotuv bo'ldi": ['Продажа', 'Sold'],
  'Sotuv summasi': ['Сумма продаж', 'Sales amount'],
  'Sarf ($)': ['Расход ($)', 'Spend ($)'],
  "Sotuv summasi (so'm)": ['Сумма продаж (сум)', 'Sales amount (UZS)'],
  Jami: ['Итого', 'Total'],

  // drill-downs
  'Lid nomi': ['Имя лида', 'Lead name'],
  Telefon: ['Телефон', 'Phone'],
  Bosqich: ['Этап', 'Stage'],
  Sabab: ['Причина', 'Reason'],
  Sana: ['Дата', 'Date'],
  Ism: ['Имя', 'Name'],
  Sdelka: ['Сделка', 'Deal'],
  'Sdelka #{id}': ['Сделка #{id}', 'Deal #{id}'],
  "Mas'ul": ['Ответственный', 'Responsible'],
  Summa: ['Сумма', 'Amount'],
  Manba: ['Источник', 'Source'],
  '{shown} / {total} ta lid': ['{shown} / {total} лидов', '{shown} / {total} leads'],
  "Yana {n} ta ko'rsatish": ['Показать ещё {n}', 'Show {n} more'],
  'Hammasi ({n})': ['Все ({n})', 'All ({n})'],
  "Yig'ish": ['Свернуть', 'Collapse'],
  '{n} lid': ['{n} лидов', '{n} leads'],

  // empty states
  "Ma'lumot topilmadi": ['Данные не найдены', 'No data found'],
  'Faol formalar topilmadi': ['Активные формы не найдены', 'No active forms found'],
  'Formalar topilmadi': ['Формы не найдены', 'No forms found'],
  "Lidlar yo'q.": ['Лидов нет.', 'No leads.'],

  // data values shown through t()
  'Yangi lid': ['Новый лид', 'New lead'],
  "Aloqa o'rnatildi": ['Контакт установлен', 'Contacted'],
  'Uchrashuv belgilandi': ['Встреча назначена', 'Meeting booked'],
  "Uchrashuv bo'ldi": ['Встреча состоялась', 'Meeting held'],
  Sotildi: ['Продано', 'Sold'],
  'Bekor qilindi': ['Отменено', 'Cancelled'],
  "Raqam noto'g'ri": ['Неверный номер', 'Wrong number'],
  'Javob bermadi': ['Не ответил', 'No answer'],
  "Qiziqish yo'q": ['Нет интереса', 'Not interested'],
  'Boshqa shahar': ['Другой город', 'Another city'],
  Dublikat: ['Дубликат', 'Duplicate'],
  Spam: ['Спам', 'Spam'],
  'Narx qimmat': ['Дорого', 'Price too high'],
  'Vaqt mos emas': ['Неудобное время', 'Timing not suitable'],
  'Raqobatchini tanladi': ['Выбрал конкурента', 'Chose a competitor'],
  "O'ylab ko'radi": ['Подумает', 'Will think it over'],
  'Manzil uzoq': ['Далеко', 'Location too far'],
  'Yangi / Uchrashuv': ['Новая / Встреча', 'New / Meeting'],
  "Kelishuv bo'ldi": ['Договорились', 'Agreed'],
  'Ish boshlandi': ['Работа начата', 'Work started'],
  "Bekor bo'ldi": ['Отменена', 'Cancelled'],
  'Veb-sayt': ['Веб-сайт', 'Website'],
  Tavsiya: ['Рекомендация', 'Referral'],
  "Qo'ng'iroq": ['Звонок', 'Call'],
  // Meta campaign names are proper names (filter options + drill titles): kept as they are in Ads Manager
  'Lid forma | Asosiy taklif': ['Lid forma | Asosiy taklif', 'Lid forma | Asosiy taklif'],
  'Reels | Biznes paket': ['Reels | Biznes paket', 'Reels | Biznes paket'],
  'Retarget | Sayt mehmonlari': ['Retarget | Sayt mehmonlari', 'Retarget | Sayt mehmonlari'],
  'Aksiya | Konsultatsiya': ['Aksiya | Konsultatsiya', 'Aksiya | Konsultatsiya'],
  // adsets + creatives (demo ad account); 'adset · campaign' form names follow after the object
  'Toshkent 18-34': ['Ташкент 18-34', 'Tashkent 18-34'],
  'Viloyatlar 22-45': ['Регионы 22-45', 'Regions 22-45'],
  'Lookalike 1%': ['Lookalike 1%', 'Lookalike 1%'],
  Qiziqishlar: ['Интересы', 'Interests'],
  'Video 15s': ['Видео 15с', 'Video 15s'],
  Karusel: ['Карусель', 'Carousel'],
  'Reels — natija': ['Reels — результат', 'Reels — results'],
  'Sharh (testimonial)': ['Отзыв (testimonial)', 'Testimonial'],
  'Statik banner': ['Статичный баннер', 'Static banner'],
  ...formNames(),
  "Reklama kabineti vaqt zonasi Toshkent emas ({tz}): Meta kunlari CRM kunlariga to'liq mos kelmaydi": ['Часовой пояс рекламного кабинета не Ташкент ({tz}): дни Meta не полностью совпадают с днями CRM', "The ad account's time zone is not Tashkent ({tz}): Meta's days do not fully match the CRM's days"],
  "{ccy} valyutasining kursi topilmadi: bu sarf jami summaga qo'shilmagan": ['Курс валюты {ccy} не найден: этот расход не включён в итог', 'No rate found for {ccy}: this spend is not included in the total'],
} satisfies Dict

/** Form labels 'adset · campaign' (Forma filter options + drill subtitles): only the adset part is translated. */
function formNames(): Dict {
  const adsets: Record<string, readonly [string, string]> = {
    'Toshkent 18-34': ['Ташкент 18-34', 'Tashkent 18-34'],
    'Viloyatlar 22-45': ['Регионы 22-45', 'Regions 22-45'],
    'Lookalike 1%': ['Lookalike 1%', 'Lookalike 1%'],
    Qiziqishlar: ['Интересы', 'Interests'],
  }
  const campaigns = ['Lid forma | Asosiy taklif', 'Reels | Biznes paket', 'Retarget | Sayt mehmonlari', 'Aksiya | Konsultatsiya']
  const out: Record<string, readonly [string, string]> = {}
  for (const [a, [ru, en]] of Object.entries(adsets)) for (const c of campaigns) out[`${a} · ${c}`] = [`${ru} · ${c}`, `${en} · ${c}`]
  return out
}
