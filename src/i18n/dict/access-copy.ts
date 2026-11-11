import type { Dict } from '@/i18n'

/** features/access/AccessSheet.tsx — each person's login and password, shown and copied again */
export default {
  'Loginni nusxalash': ['Скопировать логин', 'Copy login'],
  'Parolni nusxalash': ['Скопировать пароль', 'Copy password'],
  '{what} nusxalandi': ['{what} скопирован', '{what} copied'],
  "Nusxalab bo'lmadi": ['Не удалось скопировать', "Couldn't copy"],
  "Saqlanmagan — ko'rish uchun parolni yangilang": ['Не сохранён — обновите пароль, чтобы видеть его', 'Not saved — reset the password to see it'],
  'Bu parolni Studio saqlamagan — kalit tugmasi bilan yangilang': [
    'Studio не сохранила этот пароль — обновите его кнопкой с ключом',
    "Studio didn't keep this password — reset it with the key button",
  ],
  'Yangi parol nusxalandi': ['Новый пароль скопирован', 'New password copied'],
  'Parol yangilandi — «Nusxalash» bilan oling': ['Пароль обновлён — возьмите его кнопкой «Копировать»', 'Password reset — take it with «Copy»'],
  'Yangi parol yaratib nusxalash': ['Создать новый пароль и скопировать', 'Make a new password and copy it'],
} satisfies Dict
