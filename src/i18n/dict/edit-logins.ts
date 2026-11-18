import type { Dict } from '@/i18n'

/** «Loginlar» (features/edit/Logins.tsx) and the frame's silent login (features/edit/frameLogin.ts, FrameLoginNote.tsx). */
export default {
  Loginlar: ['Логины', 'Logins'],
  "Login qo'shish": ['Добавить логин', 'Add a login'],
  Admin: ['Админ', 'Admin'],
  Xodimlar: ['Сотрудники', 'Staff'],
  Xodim: ['Сотрудник', 'Staff member'],
  Hammasi: ['Всё', 'Everything'],
  "Hali hech kim yo'q": ['Пока никого нет', 'Nobody yet'],
  'Parol kiritilmagan': ['Пароль не задан', 'No password set'],
  Yashirish: ['Скрыть', 'Hide'],
  "Ko'rsatish": ['Показать', 'Show'],
  'Nusxa olish': ['Копировать', 'Copy'],
  'Yuklanmoqda…': ['Загрузка…', 'Loading…'],
  "Kirish ma'lumoti eskirgan": ['Данные для входа устарели', 'The sign-in details are out of date'],
  yangilash: ['обновить', 'refresh'],
  "Admin paroli server sozlamalarida yo'q": ['Пароля админа нет в настройках сервера', "The admin password isn't in the server settings"],
} satisfies Dict
