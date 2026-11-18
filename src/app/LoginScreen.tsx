import { useState, type FormEvent } from 'react'
import { KeyRound, LogIn, SearchX } from 'lucide-react'
import { useT } from '@/i18n'
import { Button } from '@/ui/controls'
import { Field, TextInput } from '@/ui/form'
import { ToastProvider, TooltipProvider } from '@/ui/overlay'
import { ThemeController } from '@/shell/ThemeController'
import { Wallpaper } from '@/shell/Wallpaper'
import { LoginError, viewerLogin } from './boot'

/** The dashboard's login, shown instead of the app until the viewer signs in (Studio's published-address login card). */
export function LoginScreen({ name }: { name: string }) {
  return (
    <TooltipProvider>
      <ToastProvider>
        <ThemeController workspaceAccent="blue" />
        <Wallpaper />
        <LoginCard name={name} />
      </ToastProvider>
    </TooltipProvider>
  )
}

function LoginCard({ name }: { name: string }) {
  const { t } = useT()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await viewerLogin(login.trim(), password)
      window.location.reload()
    } catch (err) {
      const code = err instanceof LoginError ? err.code : ''
      setError(
        code === 'TOO_SOON'
          ? t("Juda ko'p urinish — 10 daqiqadan keyin qayta urinib ko'ring")
          : code === 'VIEWER_BAD_LOGIN'
            ? t("Login yoki parol noto'g'ri")
            : code === 'VIEWER_DISABLED'
              ? t("Sizning kirishingiz o'chirilgan — dashbord egasiga murojaat qiling")
              : t("Kirib bo'lmadi — internetni tekshiring"),
      )
      setBusy(false)
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <form onSubmit={(e) => void submit(e)} className="glass page-in flex w-full max-w-[400px] flex-col gap-4 rounded-[28px] p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary-strong">
          <KeyRound aria-hidden size={22} />
        </span>
        <div>
          <h1 className="text-[1.5rem] leading-tight font-bold tracking-[-0.02em] text-ink">{name}</h1>
          <p className="mt-1 text-[0.9375rem] text-ink-2">{t('Dashbordni ochish uchun kiring')}</p>
        </div>
        <Field label={t('Login')}>
          <TextInput value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoFocus spellCheck={false} />
        </Field>
        <Field label={t('Parol')} error={error ?? undefined}>
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <Button type="submit" variant="primary" icon={LogIn} disabled={busy || !login.trim() || !password} block>
          {busy ? t('Kirilmoqda…') : t('Kirish')}
        </Button>
        <p className="text-center text-[0.75rem] text-ink-3">Data365</p>
      </form>
    </main>
  )
}

/** The publishing server does not know this dashboard's address (removed or renamed). */
export function NotFoundScreen() {
  const { t } = useT()
  return (
    <TooltipProvider>
      <ToastProvider>
        <ThemeController workspaceAccent="blue" />
        <Wallpaper />
        <main className="relative grid min-h-dvh place-items-center px-4 py-10">
          <div className="glass page-in flex w-full max-w-[400px] flex-col items-center gap-3 rounded-[28px] p-6 text-center sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-ink-3">
              <SearchX aria-hidden size={22} />
            </span>
            <h1 className="text-[1.25rem] font-semibold text-ink">{t('Dashbord topilmadi')}</h1>
            <p className="text-[0.9375rem] text-ink-2">{t("Manzilni tekshiring yoki sizga havola bergan odamdan yangisini so'rang.")}</p>
          </div>
        </main>
      </ToastProvider>
    </TooltipProvider>
  )
}
