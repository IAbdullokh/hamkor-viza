import type { Dict } from '@/i18n'

/** «Sinov havolasi» — the shareable test link of an edit session and its public page (features/edit/Share.tsx, SinovPage.tsx). */
export default {
  'Sinov havolasi': ['Тестовая ссылка', 'Test link'],
  'Havola nusxalandi': ['Ссылка скопирована', 'Link copied'],
  '{date} gacha': ['до {date}', 'until {date}'],
  Mehmon: ['Гость', 'Guest'],
  '{name} tasdiqladi': ['{name} подтвердил(а)', '{name} approved'],
  '{name}: kerak emas': ['{name}: не нужно', '{name}: not needed'],
  'Havola muddati tugagan': ['Срок действия ссылки истёк', 'This link has expired'],
  "Juda ko'p javob — birozdan keyin qayta urining": ['Слишком много ответов — попробуйте чуть позже', 'Too many answers — try again a bit later'],
  Tasdiqlandi: ['Подтверждено', 'Approved'],
  'Javobingiz yuborildi': ['Ваш ответ отправлен', 'Your answer was sent'],
  Izoh: ['Комментарий', 'Comment'],
  'Izoh / sabab': ['Комментарий / причина', 'Comment / reason'],
  'Ismingizni yozing': ['Напишите ваше имя', 'Enter your name'],
  'Sababini yozing': ['Напишите причину', 'Enter the reason'],
  Ismingiz: ['Ваше имя', 'Your name'],
  Tasdiqlayman: ['Подтверждаю', 'Approve'],
  'Kerak emas': ['Не нужно', 'Not needed'],
  'Sinov havolasi yaratildi': ['Тестовая ссылка создана', 'Test link created'],
  "Avval o'zgarish yig'ilib, ko'rinishi tayyor bo'lsin": ['Сначала изменение должно собраться и показаться', 'The change must be built and previewed first'],
  "Bu o'zgarish yopilgan": ['Это изменение закрыто', 'This change is closed'],
} satisfies Dict
