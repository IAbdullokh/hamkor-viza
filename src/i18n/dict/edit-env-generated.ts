import type { Dict } from '@/i18n'

/** «Server sozlamalari»: passwords Studio made for Nova (shown to the owner 24 h), the env file found on the server, safer saves (features/edit/ServerEnv.tsx). */
export default {
  '{name} yaratildi': ['{name} создан', '{name} created'],
  "Egasi ko'radi": ['Видит владелец', 'The owner sees it'],
  '{h} soat {m} daqiqa qoldi': ['Осталось {h} ч {m} мин', '{h} h {m} min left'],
  "Ko'rsatib bo'lmadi": ['Не удалось показать', 'Could not show it'],
  "Parolning ko'rish muddati tugagan": ['Срок показа пароля истёк', 'The password can no longer be shown'],
  "{names} o'zgaradi — davom etilsinmi?": ['{names} изменится — продолжить?', '{names} will change — continue?'],
  "Yana qo'shish": ['Добавить ещё', 'Add another'],
  'Sozlamalar faylini tanlang': ['Выберите файл настроек', 'Pick the settings file'],
} satisfies Dict
