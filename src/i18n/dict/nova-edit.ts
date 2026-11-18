import type { Dict } from '@/i18n'

/** A Studio project's «Tahrirlash» chat beside its live dashboard (features/novaedit/NovaEditPanel.tsx). */
export default {
  "Ortga qaytarib bo'lmadi — qayta urinib ko'ring": ['Не удалось вернуть — попробуйте ещё раз', "Couldn't undo — please try again"],
  // Bitrix writes (novaedit/bitrix.ts, BitrixParts.tsx)
  "{n} ta yozuv o'zgaradi:": ['Изменится записей: {n} —', '{n} {n|record|records} will change:'],
  '+ yana {n} ta': ['+ ещё {n}', '+ {n} more'],
  'Yozilmoqda…': ['Записываем…', 'Writing…'],
  "Muddati o'tdi": ['Срок истёк', 'Expired'],
  "{n} ta yaratilgan yozuv o'chirilsinmi?": ['Удалить созданные записи ({n})?', 'Delete the {n} created {n|record|records}?'],
  "Bitrix'ga yozib bo'lmadi": ['Не удалось записать в Bitrix', "Couldn't write to Bitrix"],
  "Bitrix o'zgarishlari": ['Изменения в Bitrix', 'Bitrix changes'],
} satisfies Dict
