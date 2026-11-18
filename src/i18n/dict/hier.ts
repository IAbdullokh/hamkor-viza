import type { Dict } from '@/i18n'

/** A table's hierarchy (kit/hier, blockedit HierEditor): "Ierarxiya", its levels and the open / close buttons. */
export default {
  "Daraja qo'shish": ['Добавить уровень', 'Add level'],
  'Darajani olib tashlash': ['Убрать уровень', 'Remove level'],
  'Ierarxiyani olib tashlash': ['Убрать иерархию', 'Remove hierarchy'],
  "Jadvalning o'z kesimi — birinchi daraja": ['Разрез самой таблицы — первый уровень', "The table's own breakdown — the first level"],
  "Qatorni bosib ichini oching. Ko'pi bilan 3 daraja.": ['Нажмите строку, чтобы раскрыть. Не больше 3 уровней.', 'Click a row to open it. 3 levels at most.'],
  'Hammasini ochish': ['Раскрыть все', 'Expand all'],
  'Hammasini yopish': ['Свернуть все', 'Collapse all'],
  Oldinga: ['Раньше', 'Earlier'],
  Keyinga: ['Позже', 'Later'],
  'Sana (oy)': ['Дата (месяц)', 'Date (month)'],
  'Sana (hafta)': ['Дата (неделя)', 'Date (week)'],
  'Sana (kun)': ['Дата (день)', 'Date (day)'],
} satisfies Dict
