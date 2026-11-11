import type { Dict } from '@/i18n'

/** "Siri bilan chaqirish" card (features/voice/SiriShortcutCard.tsx) and the live-unavailable reason in Nova's voice view. */
export default {
  "Siri bilan chaqirish": ["Вызов через Siri", "Call with Siri"],
  "«Hey Siri, Nova» — eng qulay va tejamkor yo'l": ["«Привет, Siri, Nova» — самый удобный и экономный способ", "“Hey Siri, Nova” — the easiest, most frugal way"],
  "Mikrofon belgisi chiqmaydi: «Hey Siri» ni Mac'ning o'zi alohida tejamkor protsessorda eshitadi": [
    "Нет значка микрофона: «Привет, Siri» слушает сам Mac на отдельном экономичном процессоре",
    "No microphone indicator: the Mac itself hears “Hey Siri” on a separate low-power processor",
  ],
  "Batareya sarflanmaydi: Studio siz chaqirmaguningizcha mikrofonni ochmaydi": [
    "Батарея не тратится: Studio не включает микрофон, пока вы не позовёте",
    "No battery drain: Studio does not open the microphone until you call",
  ],
  "iPhone'da ham ishlaydi — buyruqlar iCloud orqali o'tadi": [
    "Работает и на iPhone — команды переходят через iCloud",
    "Works on iPhone too — shortcuts sync through iCloud",
  ],
  "«Nova» buyrug'ini yuklab olish": ["Скачать команду «Nova»", "Download the “Nova” shortcut"],
  "Apple tekshirmoqda, ~10 soniya…": ["Apple проверяет, ~10 секунд…", "Apple is checking it, ~10 seconds…"],
  "Faylni oching → «Add Shortcut». Keyin Siri'ni yoqing (4-qadam) va «Hey Siri, Nova» deng.": [
    "Откройте файл → «Добавить быструю команду». Затем включите Siri (шаг 4) и скажите «Привет, Siri, Nova».",
    "Open the file → “Add Shortcut”. Then turn on Siri (step 4) and say “Hey Siri, Nova”.",
  ],
  "Bir bosishda tayyor buyruq: oching → «Add Shortcut». Qo'lda qilish shart emas.": [
    "Готовая команда в один клик: откройте → «Добавить быструю команду». Вручную ничего делать не нужно.",
    "A ready shortcut in one click: open it → “Add Shortcut”. Nothing to set up by hand.",
  ],
  "Nova.shortcut yuklab olindi — faylni oching va «Add Shortcut» ni bosing": [
    "Nova.shortcut скачан — откройте файл и нажмите «Добавить быструю команду»",
    "Nova.shortcut downloaded — open it and click “Add Shortcut”",
  ],
  "Bu serverda buyruqni tayyorlab bo'lmaydi — quyidagi qadamlarni bajaring": [
    "На этом сервере команду не подготовить — выполните шаги ниже",
    "This server can't prepare the shortcut — follow the steps below",
  ],
  "Buyruqni tayyorlab bo'lmadi — qayta urinib ko'ring": ["Не удалось подготовить команду — попробуйте ещё раз", "Couldn't prepare the shortcut — please try again"],
  "Yoki qo'lda": ["Или вручную", "Or by hand"],
  "Qanday sozlanadi": ["Как настроить", "How to set it up"],
  "«Shortcuts» ilovasini oching va «+» bilan yangi buyruq yarating.": [
    "Откройте приложение «Быстрые команды» (Shortcuts) и создайте новую команду кнопкой «+».",
    "Open the Shortcuts app and create a new shortcut with “+”.",
  ],
  "«Open URLs» amalini qo'shing va shu havolani qo'ying:": [
    "Добавьте действие «Открыть URL» (Open URLs) и вставьте эту ссылку:",
    "Add the “Open URLs” action and paste this link:",
  ],
  "Nova havolasi": ["Ссылка Nova", "Nova link"],
  "Buyruqni «Nova» deb nomlang.": ["Назовите команду «Nova».", "Name the shortcut “Nova”."],
  "Siri'ni yoqing: Tizim sozlamalari → Apple Intelligence & Siri → «Listen for» → «Siri» yoki «Hey Siri».": [
    "Включите Siri: Системные настройки → Apple Intelligence и Siri → «Слушать» (Listen for) → «Siri» или «Привет, Siri».",
    "Turn on Siri: System Settings → Apple Intelligence & Siri → “Listen for” → “Siri” or “Hey Siri”.",
  ],
  "Ayting:": ["Скажите:", "Say:"],
  "«Hey Siri, Nova»": ["«Привет, Siri, Nova»", "“Hey Siri, Nova”"],
  "Studio ochiladi va Nova darhol tinglaydi.": ["Откроется Studio, и Nova сразу начнёт слушать.", "Studio opens and Nova starts listening at once."],
  "Klaviatura bilan: buyruq tafsilotlarida «Add Keyboard Shortcut», masalan ⌥ Space.": [
    "С клавиатуры: в деталях команды «Добавить сочетание клавиш» (Add Keyboard Shortcut), например ⌥ Space.",
    "From the keyboard: in the shortcut's details, “Add Keyboard Shortcut”, e.g. ⌥ Space.",
  ],
  "Bu havola faqat shu kompyuterda ochiladi. iPhone'da Studio internetdagi manzilda ochilgach ishlaydi.": [
    "Эта ссылка открывается только на этом компьютере. На iPhone заработает, когда Studio будет доступна по адресу в интернете.",
    "This link opens only on this computer. On iPhone it works once Studio has an address on the internet.",
  ],
  "iPhone'da ham xuddi shu: «Hey Siri, Nova».": ["На iPhone так же: «Привет, Siri, Nova».", "Same on iPhone: “Hey Siri, Nova”."],
  "Havolani sinab ko'rish": ["Проверить ссылку", "Try the link"],
  // Nova's voice view when live conversation was asked for but cannot run
  "Bu brauzerda jonli suhbat ishlamaydi — sharni bosib, ovoz bilan yozing": [
    "В этом браузере живой разговор не работает — нажмите на шар и диктуйте",
    "Live conversation doesn't work in this browser — tap the orb to dictate",
  ],
} satisfies Dict
