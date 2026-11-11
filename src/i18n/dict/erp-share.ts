import type { Dict } from '@/i18n'

/** ERP: a process map's share links (features/erp/share, server Data365.Meetings/Share). */
export default {
  Ulashish: ['Поделиться', 'Share'],
  "Ko'rish havolasi": ['Ссылка для просмотра', 'View link'],
  'Tahrirlash havolasi': ['Ссылка для редактирования', 'Edit link'],
  'Havolani yaratish': ['Создать ссылку', 'Create link'],
  'Havola yoqilgan': ['Ссылка включена', 'Link is on'],
  "Havolani yaratib bo'lmadi — qayta urinib ko'ring": ['Не удалось создать ссылку — попробуйте ещё раз', "Couldn't create the link — try again"],
  // one map per video + «Hammasi», and links that reach some of them (docs/meeting-maps.md §5)
  'Qaysi xarita': ['Какая карта', 'Which map'],
  '{n}-video': ['Видео {n}', 'Video {n}'],
  '{n}-video · {k} qadam': ['Видео {n} · шагов: {k}', 'Video {n} · {k} steps'],
  'Havola turi': ['Тип ссылки', 'Link type'],
  'Qaysi videolar': ['Какие видео', 'Which videos'],
  'Xarita hali tayyor emas': ['Карта ещё не готова', 'The map is not ready yet'],
} satisfies Dict
