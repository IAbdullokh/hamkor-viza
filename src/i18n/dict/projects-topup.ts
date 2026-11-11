import type { Dict } from '@/i18n'

/** The passes of the Bitrix24 top-up after a file, shown under the running phase (load/format.ts phaseItems). "Yangi lidlar" lives in page-chatlar. */
export default {
  "Oldin olinganlar qo'shilyapti": ['Добавляем уже полученное ранее', 'Adding what was pulled before'],
  "O'zgarganlar tekshirilyapti": ['Проверяем изменённые', 'Checking changed records'],
  'Yangi sdelkalar': ['Новые сделки', 'New deals'],
  Yetishmayotganlar: ['Недостающие', 'Missing records'],
  'Telefon raqamlari': ['Номера телефонов', 'Phone numbers'],
} satisfies Dict
