import type { Dict } from '@/i18n'

/** «Joylashlar» — the last three deploys, compared and undone (features/edit/Deploys.tsx). */
export default {
  Joylashlar: ['Выкладки', 'Deploys'],
  "Hali joylash yo'q": ['Выкладок ещё нет', 'No deploys yet'],
  "Yuklab bo'lmadi": ['Не удалось загрузить', 'Could not load'],
  '{n} ta fayl': ['{n} файл.', '{n} files'],
  Saytda: ['На сайте', 'Live'],
  Qaytarilgan: ['Отменено', 'Undone'],
  'Faqat Oldin': ['Только «до»', 'Before only'],
  Ikkalasi: ['Оба', 'Both'],
  'Faqat Keyin': ['Только «после»', 'After only'],
  Oldin: ['До', 'Before'],
  Keyin: ['После', 'After'],
  Saqlanmagan: ['Не сохранено', 'Not kept'],
  'Shu deploydan oldingi holatga qaytarish': ['Вернуть состояние до этой выкладки', 'Go back to before this deploy'],
  'Qaytarasizmi?': ['Вернуть?', 'Go back?'],
  Qaytarish: ['Вернуть', 'Go back'],
  '{n} ta joylash qaytariladi: {list}': ['Будет отменено выкладок: {n} — {list}', '{n} deploys will be undone: {list}'],
  'Bazani ham joylashdan oldingi holatiga qaytarish': ['Вернуть и базу к состоянию до выкладки', 'Also put the database back to before the deploy'],
  "GitHub'da qaytarilmoqda": ['Отмена на GitHub', 'Undoing on GitHub'],
  'Saytga joylanmoqda': ['Выкладка на сайт', 'Deploying to the site'],
  'Qaytarilmoqda…': ['Возвращаем…', 'Going back…'],
  Qaytarildi: ['Возвращено', 'Done'],
  "Qaytarish to'xtadi": ['Возврат остановлен', 'Going back stopped'],
} satisfies Dict
