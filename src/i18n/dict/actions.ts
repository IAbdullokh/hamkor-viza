import type { Dict } from '@/i18n'

/** Nova's actions: opening pages and changes that wait for "Tasdiqlash" (features/actions). */
export default {
  "Nova ochdi: {label}": ["Nova открыла: {label}", "Nova opened: {label}"],
  "Nova bu sahifani ocha olmaydi: {label}": ["Nova не может открыть эту страницу: {label}", "Nova can't open this page: {label}"],
  "Ochildi: {label}": ["Открыто: {label}", "Opened: {label}"],
  "Ruxsat yo'q: {label}": ["Нет доступа: {label}", "No access: {label}"],
  "Nova taklif qilyapti — tasdiqlasangiz bajariladi": [
    "Предложение Nova — выполнится после подтверждения",
    "Nova suggests this — it runs once you confirm",
  ],
  "Bajarilmoqda…": ["Выполняется…", "Running…"],
  "Bajarildi": ["Готово", "Done"],
  "Bekor qilindi": ["Отменено", "Cancelled"],
  "Ochish": ["Открыть", "Open"],
  "Bu amal uchun ruxsat yo'q": ["Нет прав на это действие", "You don't have permission for this action"],
  "Taklif eskirgan — qaytadan so'rang": ["Предложение устарело — спросите ещё раз", "This suggestion has expired — ask again"],
  "Server bilan aloqa yo'q — qayta urinib ko'ring": ["Нет связи с сервером — попробуйте ещё раз", "Can't reach the server — try again"],
  "Amalni bajarib bo'lmadi": ["Не удалось выполнить действие", "Couldn't run the action"],
  "Qayta urinish": ["Повторить", "Try again"],
  "Tasdiqlash": ["Подтвердить", "Confirm"],
  "Bekor qilish": ["Отмена", "Cancel"],
  "Orqaga": ["Назад", "Back"],
  // page actions: what Nova did on the page (toasts and chips under the answer)
  "Nova: «{field}» — «{value}» yozildi": ["Nova: «{field}» — введено «{value}»", "Nova: typed «{value}» into «{field}»"],
  "Nova: «{option}» tanlandi": ["Nova: выбрано «{option}»", "Nova: chose «{option}»"],
  "Nova: «{button}» bosildi": ["Nova: нажата кнопка «{button}»", "Nova: pressed «{button}»"],
  "Nova: «{name}» loyihasi yaratildi": ["Nova: проект «{name}» создан", "Nova: created the project «{name}»"],
  "Sahifada «{name}» topilmadi": ["На странице нет «{name}»", "«{name}» isn't on this page"],
  "Nova maxfiy maydonlarga yozmaydi: «{name}»": ["Nova не вводит данные в секретные поля: «{name}»", "Nova never types into secret fields: «{name}»"],
  "«{name}» hozir faol emas": ["«{name}» сейчас недоступно", "«{name}» isn't available right now"],
  "«{name}» varianti topilmadi": ["Вариант «{name}» не найден", "No option «{name}» here"],
  "«{name}» uchun tasdiqlang": ["Подтвердите «{name}»", "Confirm «{name}» first"],
  // the Tahrirlash tab (edit_project): Nova opens it, the owner applies / publishes / rolls back
  "Nova buni o'zi bosmaydi: «{name}» — uni o'zingiz bosing va tasdiqlang": [
    "Nova не нажимает это сама: «{name}» — нажмите сами и подтвердите",
    "Nova never presses this itself: «{name}» — press it yourself and confirm",
  ],
  "Nova GitHub'ga yubormaydi va serverga chiqarmaydi — «{button}» tugmasini o'zingiz bosing va tasdiqlash so'zini yozing": [
    "Nova не отправляет в GitHub и не публикует на сервер — нажмите «{button}» сами и введите слово подтверждения",
    "Nova never pushes to GitHub or deploys — press «{button}» yourself and type the confirmation word",
  ],
  "Loyiha kodini faqat egasi o'zgartira oladi": ["Код проекта может менять только владелец", "Only the owner can change a project's code"],
  "Nova «{button}» tugmasini bosmoqchi — tasdiqlang yoki «ha» deng": [
    "Nova хочет нажать «{button}» — подтвердите или скажите «да»",
    "Nova wants to press «{button}» — confirm or say “yes”",
  ],
} satisfies Dict
