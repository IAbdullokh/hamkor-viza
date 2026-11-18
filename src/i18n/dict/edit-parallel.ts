import type { Dict } from '@/i18n'

/** Another change while one deploys: the send choice, the side-by-side switch, the waiting deploy button (features/edit/Parallel.tsx, parallelRules.ts). */
export default {
  "Navbatga qo'yish": ['В очередь', 'Queue it'],
  'Hozir boshlash': ['Начать сейчас', 'Start now'],
  Yuborilganda: ['При отправке', 'On send'],
  "Parallel o'zgarishlar": ['Параллельные изменения', 'Parallel changes'],
  "{n}-o'zgarish": ['Изменение {n}', 'Change {n}'],
  'Navbatda: {name} joylanmoqda': ['В очереди: публикуется {name}', 'Queued: {name} is deploying'],
  '{name} saytga joylandi': ['{name} опубликовано на сайте', '{name} is live'],
  "{name}: joylash to'xtadi": ['{name}: публикация остановлена', '{name}: deploy stopped'],
} satisfies Dict
