import type { Dict } from '@/i18n'

/** Pictures and files in the block chat, and the zoomed editor's preview pane (features/blockedit/attach.ts, BlockChat.tsx, BlockEditOverlay.tsx). */
export default {
  'Rasm yoki fayl biriktirish': ['Прикрепить картинку или файл', 'Attach a picture or a file'],
  'Rasmni yoki faylni shu yerga tashlang': ['Перетащите картинку или файл сюда', 'Drop a picture or a file here'],
  "Bu turdagi fayl qo'shilmaydi — rasm (png, jpg, webp) yoki csv, xlsx, pdf, txt": [
    'Такой файл не подходит — картинка (png, jpg, webp) или csv, xlsx, pdf, txt',
    "This kind of file can't be added — a picture (png, jpg, webp) or csv, xlsx, pdf, txt",
  ],
  "Fayl bo'sh yoki 5 MB dan katta": ['Файл пустой или больше 5 МБ', 'The file is empty or larger than 5 MB'],
  'Bir xabarga 3 tagacha fayl': ['До 3 файлов в одном сообщении', 'Up to 3 files per message'],
  "Faylni o'qib bo'lmadi": ['Не удалось прочитать файл', "Couldn't read the file"],
  "«{name}» ni olib tashlash": ['Убрать «{name}»', 'Remove «{name}»'],
  'Shu rasmdagidek qil': ['Сделай как на картинке', 'Make it look like this picture'],
  "Shu faylga qarab o'zgartir": ['Измени по этому файлу', 'Change it based on this file'],
  "Fayl qabul qilinmadi — turi yoki hajmi to'g'ri kelmaydi": [
    'Файл не принят — не подходит тип или размер',
    "The file wasn't accepted — its type or size doesn't fit",
  ],
  "Nova rasmni ko'rib chiqmoqda…": ['Nova рассматривает картинку…', 'Nova is looking at the picture…'],
  "Blok ko'rinishi": ['Вид блока', 'Block preview'],
  "Ko'rinishni kattalashtirish": ['Увеличить превью', 'Expand the preview'],
  "Ko'rinishni kichraytirish": ['Уменьшить превью', 'Shrink the preview'],
} satisfies Dict
