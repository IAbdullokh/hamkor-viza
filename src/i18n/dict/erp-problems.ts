import type { Dict } from '@/i18n'

/** «Muammolar»: every problem of the audit's interviews, the same one said by different people folded into one (features/erp/ProblemsPanel.tsx). */
export default {
  'Jami aytilgan: {n}': ['Всего названо: {n}', 'Raised in total: {n}'],
  'unikal: {n}': ['уникальных: {n}', 'unique: {n}'],
  'yechim bor: {n}': ['с решением: {n}', 'with a solution: {n}'],
  'Bu suhbatda aytilgan eng katta muammolar': ['Главные проблемы, названные в этой беседе', 'The biggest problems named in this conversation'],
  '{n} marta': ['{n} {n|раз|раза|раз}', '{n} {n|time|times}'],
  "Yechim yo'q": ['Нет решения', 'No solution'],
  'Muammo aytilmagan': ['Проблемы не названы', 'No problems named'],
} satisfies Dict
