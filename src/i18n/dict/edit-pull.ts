import type { Dict } from '@/i18n'

/** "Serverdan olish" — the project server's own changes to GitHub and the Studio folder (features/edit/PullServer.tsx). */
export default {
  'Serverdan olish': ['Забрать с сервера', 'Pull from server'],
  'Server sozlanmagan': ['Сервер не настроен', 'No server set up'],
  "Serverda yangi narsa yo'q": ['На сервере ничего нового', 'Nothing new on the server'],
  "Serverni tekshirib bo'lmadi": ['Не удалось проверить сервер', 'Could not check the server'],
  "Serverdagi o'zgarishlarni olasizmi?": ['Забрать изменения с сервера?', 'Take the changes from the server?'],
  "Ular GitHub'ga va Studio papkasiga olinadi. Sayt o'zgarmaydi.": [
    'Они попадут на GitHub и в папку Studio. Сайт не меняется.',
    'They go to GitHub and the Studio folder. The site does not change.',
  ],
  'Server tekshirilmoqda…': ['Проверяем сервер…', 'Checking the server…'],
  "Serverda GitHub'da yo'q o'zgarish yo'q": ['На сервере нет изменений, которых нет на GitHub', 'The server has nothing that is not on GitHub'],
  '{f} — maxfiy fayl, olinmaydi': ['{f} — секретный файл, не забирается', '{f} — a secret file, not taken'],
  "Serverdagi o'zgarishlar GitHub'da va Studio papkasida": ['Изменения с сервера теперь на GitHub и в папке Studio', "The server's changes are on GitHub and in the Studio folder"],
  "Serverdagi o'zgarishlar GitHub'ga yuborildi; Studio papkasida o'z o'zgarishlari bor — u o'zi yangilanmadi": [
    'Изменения с сервера отправлены на GitHub; в папке Studio есть свои изменения — она не обновилась сама',
    "The server's changes went to GitHub; the Studio folder has changes of its own — it did not update itself",
  ],
} satisfies Dict
