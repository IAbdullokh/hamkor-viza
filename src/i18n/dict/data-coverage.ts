import type { Dict } from '@/i18n'

/** kit/CoverageNote: what the dashboard's data holds, when the period reaches past it */
export default {
  '{what}: {from} – {to} · {n} ta': ['{what}: {from} – {to} · {n} шт.', '{what}: {from} – {to} · {n}'],
  "{what}: ma'lumot yo'q": ['{what}: данных нет', '{what}: no data'],
} satisfies Dict
