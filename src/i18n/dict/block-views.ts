import type { Dict } from '@/i18n'

/** A block's view tabs in the zoomed editor (blockedit/ViewsEditor): "Ko'rinishlar", hide / rename / move a view. */
export default {
  "Ko'rinishlar": ['Вкладки', 'Views'],
  "Siz «{name}» ko'rinishidasiz — ustun sozlamalari shu ko'rinish uchun": ['Вы на вкладке «{name}» — настройки столбцов действуют для неё', "You are on the «{name}» view — column settings apply to it"],
  "«{name}» ko'rinishining yangi nomi": ['Новое название вкладки «{name}»', 'New name of the «{name}» view'],
  "«{name}» — nomini o'zgartirish": ['«{name}» — переименовать', '«{name}» — rename'],
  '«{name}» — chapga surish': ['«{name}» — сдвинуть влево', '«{name}» — move left'],
  "«{name}» — o'ngga surish": ['«{name}» — сдвинуть вправо', '«{name}» — move right'],
  'Chapga surish': ['Сдвинуть влево', 'Move left'],
  "O'ngga surish": ['Сдвинуть вправо', 'Move right'],
  "Bitta ko'rinish qolishi kerak": ['Должна остаться хотя бы одна вкладка', 'At least one view has to stay'],
  "«{name}» ko'rinishini olib tashlash": ['Убрать вкладку «{name}»', 'Remove the «{name}» view'],
  'Olib tashlangan:': ['Убраны:', 'Removed:'],
  "«{name}» ko'rinishini qaytarish": ['Вернуть вкладку «{name}»', 'Bring back the «{name}» view'],
} satisfies Dict
