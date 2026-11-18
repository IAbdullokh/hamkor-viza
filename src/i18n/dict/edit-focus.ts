import type { Dict } from '@/i18n'

/** The live-edit workspace (full screen: the view switch, the slim bar) and the comfortable chat (web/FramedView.tsx, features/edit/Chat.tsx). */
export default {
  'Sayt + chat': ['Сайт + чат', 'Site + chat'],
  'Faqat chat': ['Только чат', 'Chat only'],
  'Faqat sayt': ['Только сайт', 'Site only'],
  'Boshqa amallar': ['Другие действия', 'More actions'],
  Pastga: ['Вниз', 'Jump to latest'],
  "{n} fayl o'zgardi": ['{n} {n|файл изменён|файла изменено|файлов изменено}', '{n} {n|file|files} changed'],
} satisfies Dict
