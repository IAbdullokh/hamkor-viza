import type { Dict } from '@/i18n'

/** «Saytga joylash» in the page header and its confirm window (features/edit/Publish.tsx, publishRules.deployPlan). */
export default {
  'Saytga joylaysizmi?': ['Опубликовать на сайте?', 'Deploy to the site?'],
  "Nova o'zgarishi: {title}": ['Изменение Nova: {title}', "Nova's change: {title}"],
  "{n} ta fayl o'zgaradi": ['{n|Изменится|Изменятся|Изменятся} {n} {n|файл|файла|файлов}', '{n} {n|file changes|files change}'],
  "Serverda boshqa o'zgarishlar bor ({n} ta fayl)": ['На сервере есть другие изменения ({n} {n|файл|файла|файлов})', 'The server has other changes ({n} {n|file|files})'],
  "Serverda boshqa o'zgarishlar bor ({n} ta commit)": ['На сервере есть другие изменения ({n} {n|коммит|коммита|коммитов})', 'The server has other changes ({n} {n|commit|commits})'],
  'Serverdagini ham olish': ['Забрать и серверные', "Take the server's too"],
  'Bizniki qolsin': ['Оставить наши', 'Keep ours'],
  "GitHub'ga saqlanadi": ['сохраняется на GitHub', 'saved to GitHub'],
  'saytga joylanadi': ['публикуется на сайте', 'deployed to the site'],
  'sayt tekshiriladi': ['сайт проверяется', 'the site is checked'],
  "sayt o'zi yangilanadi": ['сайт обновляется сам', 'the site updates itself'],
  'Tekshiruv toza — joylanmoqda': ['Проверка чистая — публикую', 'All checks clean — deploying'],
} satisfies Dict
