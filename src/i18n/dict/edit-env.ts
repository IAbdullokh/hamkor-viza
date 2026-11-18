import type { Dict } from '@/i18n'

/** «Server sozlamalari» — the project's env file on its own server, and Nova's requests for it in the chat (features/edit/ServerEnv.tsx). */
export default {
  'Server sozlamalari': ['Настройки сервера', 'Server settings'],
  'Kiritilgan': ['Задано', 'Set'],
  'Kiritilmagan': ['Не задано', 'Not set'],
  'Yangi qiymat': ['Новое значение', 'New value'],
  'Yangi sozlama nomi': ['Имя новой настройки', 'New setting name'],
  'Servislarni qayta ishga tushirish': ['Перезапустить сервисы', 'Restart the services'],
  'Bu loyihaning serveri sozlanmagan': ['Сервер этого проекта не настроен', "This project's server is not set up"],
  "Server sozlamalari faylini o'qib bo'lmadi": ['Не удалось прочитать файл настроек сервера', 'Could not read the server settings file'],
  "Server sozlamalarini yozib bo'lmadi": ['Не удалось записать настройки сервера', 'Could not write the server settings'],
  'Yaratish': ['Создать', 'Generate'],
  'Nusxa olish': ['Скопировать', 'Copy'],
} satisfies Dict
