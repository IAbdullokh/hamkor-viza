import type { Dict } from '@/i18n'

/** «Kirish» of a code project (features/access/AccessSheet.tsx with features/edit/ProjectAccess.tsx). */
export default {
  '{name} — kim ocha oladi': ['{name} — кто может открыть', '{name} — who can open it'],
  "Bu loyiha hali kirish ro'yxatini qo'llab-quvvatlamaydi": ['Этот проект пока не поддерживает список доступа', "This project doesn't support an access list yet"],
  "Nova'dan qo'shishni so'rash": ['Попросить Nova добавить', 'Ask Nova to add it'],
  "Ko'radi": ['Видит', 'Sees'],
  "«{name}» endi kira olmaydi.": ['«{name}» больше не сможет войти.', '«{name}» will no longer be able to sign in.'],
  "«{name}» uchun yangi parol yaratiladi. Eski parol ishlamay qoladi.": ['Для «{name}» будет создан новый пароль. Старый перестанет работать.', 'A new password will be made for «{name}». The old one will stop working.'],
  "Kamida bitta «Hammasi»ni ko'radigan yoqilgan kishi qolishi kerak": ['Должен остаться хотя бы один включённый человек, который видит всё', 'At least one enabled person who sees everything must remain'],
  'Avval «Server sozlamalari»da faylni tanlang': ['Сначала выберите файл в «Настройках сервера»', 'Pick the file in «Server settings» first'],
  "Nova'ga yuborib bo'lmadi": ['Не удалось отправить Nova', "Couldn't send it to Nova"],
  "Kirish ro'yxati fayli buzilgan": ['Файл списка доступа повреждён', 'The access list file is damaged'],
  "Kirish ro'yxati faylining versiyasi noma'lum": ['Неизвестная версия файла списка доступа', 'Unknown version of the access list file'],
  "Kirish ro'yxati faylini o'qib bo'lmadi": ['Не удалось прочитать файл списка доступа', "Couldn't read the access list file"],
} satisfies Dict
