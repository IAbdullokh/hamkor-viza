import type { Dict } from '@/i18n'

/** Each viewer's own filters on a dashboard, kept in their browser (features/livefilters/personal.ts). */
export default {
  "Filtr qo'shildi — faqat sizda": ['Фильтр добавлен — только у вас', 'Filter added — just for you'],
  "{n} ta filtr qo'shildi — faqat sizda": ['Добавлено фильтров: {n} — только у вас', '{n} filters added — just for you'],
  "Brauzer saqlashga ruxsat bermadi — o'zgarish faqat shu ochilishda turadi": ['Браузер не дал сохранить — изменение действует только до закрытия страницы', 'The browser would not save it — the change lasts only while this page is open'],
  'Filtrlar dashboard standartiga qaytdi': ['Фильтры вернулись к настройкам дашборда', 'Filters are back to the dashboard defaults'],
  "Filtrlarni o'zingiz uchun qo'shing, olib tashlang, joyini o'zgartiring — faqat shu brauzerda saqlanadi": ['Добавляйте, убирайте и переставляйте фильтры для себя — сохраняется только в этом браузере', 'Add, remove and move filters for yourself — saved only in this browser'],
  Sozlash: ['Настроить', 'Customize'],
  'Asl holiga': ['Как было', 'Reset to default'],
  'Mening filtrlarim': ['Мои фильтры', 'My filters'],
  "Filtrlarni o'zingiz uchun o'zgartirdingiz — faqat shu brauzerda saqlanadi. «Asl holiga» — dashboard standarti": ['Вы изменили фильтры для себя — это сохранено только в этом браузере. «Как было» — настройки дашборда', 'You changed the filters for yourself — saved only in this browser. “Reset to default” brings back the dashboard’s filters'],
  Tayyor: ['Готово', 'Done'],
  'Hamma uchun standart filtrlar': ['Фильтры по умолчанию для всех', 'Default filters for everyone'],
  "Faqat siz uchun: ⠿ — joyini o'zgartiring, ✕ — olib tashlang, «+ Filtr» — qo'shing. Shu brauzerda saqlanadi": ['Только для вас: ⠿ — переставить, ✕ — убрать, «+ Фильтр» — добавить. Сохраняется в этом браузере', 'Just for you: ⠿ to move, ✕ to remove, “+ Filter” to add. Saved in this browser'],
} satisfies Dict
