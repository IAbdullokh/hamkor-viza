import type { Dict } from '@/i18n'

/** "Joylash" step by step, «Nova hal qilsin» for a server conflict, «Jonli sayt» | «O'zgarish» (features/edit/PublishProgress.tsx, progress.ts, portfolio/PortfolioSitePage.tsx). */
export default {
  "Serverdagi o'zgarishlar olinmoqda": ['Берутся изменения с сервера', "Taking the server's changes"],
  "GitHub'dagi yangilari qo'shilmoqda": ['Добавляются новые изменения с GitHub', 'Adding what is new on GitHub'],
  "GitHub'ga saqlanmoqda": ['Сохраняется на GitHub', 'Saving to GitHub'],
  'Saytga joylanmoqda (build + restart)': ['Публикуется на сайт (сборка + перезапуск)', 'Deploying to the site (build + restart)'],
  'Sayt tekshirilmoqda': ['Проверяется сайт', 'Checking the site'],
  '≈ {n} daqiqa qoldi': ['≈ осталось {n} мин', '≈ {n} min left'],
  'Saytga joylandi': ['Опубликовано на сайте', 'Live on the site'],
  "GitHub'ga saqlandi": ['Сохранено на GitHub', 'Saved to GitHub'],
  "Joylash to'xtadi": ['Публикация остановилась', 'Deploy stopped'],
  'Sayt javob berdi (HTTP {n})': ['Сайт ответил (HTTP {n})', 'The site answered (HTTP {n})'],
  'Sayt javob bermadi (HTTP {n})': ['Сайт не ответил (HTTP {n})', 'The site did not answer (HTTP {n})'],
  'Tekshiruvni yangilab, qayta joylang': ['Обновите проверку и опубликуйте снова', 'Refresh the check and deploy again'],
  'Server ulanishini tekshirib, qayta joylang': ['Проверьте подключение к серверу и опубликуйте снова', 'Check the server connection and deploy again'],
  'GitHub ulanishini tekshirib, qayta joylang': ['Проверьте подключение к GitHub и опубликуйте снова', 'Check the GitHub connection and deploy again'],
  'Qayta joylang': ['Опубликуйте снова', 'Deploy again'],
  "Jurnalda xatoni ko'rib, qayta joylang": ['Посмотрите ошибку в журнале и опубликуйте снова', 'See the error in the log and deploy again'],
  'Saytni ochib tekshiring': ['Откройте сайт и проверьте', 'Open the site and check it'],
  "Serverdagi va GitHub'dagi o'zgarishlar to'qnashdi": ['Изменения на сервере и на GitHub конфликтуют', "The server's and GitHub's changes conflict"],
  "Serverdagi o'zgarishlar GitHub'dagi bilan to'qnashdi": ['Изменения на сервере конфликтуют с GitHub', "The server's changes conflict with GitHub's"],
  'Nova hal qilsin': ['Пусть Nova решит', 'Let Nova resolve it'],
  "Hal qilinadigan to'qnashuv yo'q": ['Нет конфликта для решения', 'No conflict to resolve'],
  "Serverdagi o'zgarishlarni birlashtirib bo'lmadi": ['Не удалось объединить изменения сервера', "Could not merge the server's changes"],
  "O'zgarish hali yig'ilmagan": ['Изменение ещё не собрано', 'The change is not built yet'],
  'Serverdagisiz davom etish': ['Продолжить без изменений сервера', 'Continue without the server changes'],
} satisfies Dict
