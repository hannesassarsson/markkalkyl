import { useState, type FormEvent } from 'react'
import { Button, Field, TextInput } from '../components/ui'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup' | 'reset'

const errorText = (msg: string) => {
  if (/invalid login/i.test(msg)) return 'Fel e-post eller lösenord.'
  if (/email not confirmed/i.test(msg)) return 'Bekräfta din e-postadress via länken vi skickade först.'
  if (/already registered/i.test(msg)) return 'Det finns redan ett konto med den e-postadressen. Logga in i stället.'
  if (/password should be at least/i.test(msg)) return 'Lösenordet måste vara minst 6 tecken.'
  if (/failed to fetch|network/i.test(msg)) return 'Kunde inte nå servern. Kontrollera internetanslutningen och försök igen.'
  if (/rate limit/i.test(msg)) return 'För många försök just nu. Vänta en stund och försök igen.'
  return msg
}

export function AuthView() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    const redirect = window.location.origin
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(errorText(error.message))
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } })
        if (error) setError(errorText(error.message))
        else if (!data.session) setInfo(`Vi har skickat en bekräftelselänk till ${email}. Klicka på den och logga sedan in.`)
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect })
        if (error) setError(errorText(error.message))
        else setInfo(`Om det finns ett konto för ${email} har vi skickat en länk för att välja nytt lösenord.`)
      }
    } finally {
      setBusy(false)
    }
  }

  const title = { login: 'Logga in', signup: 'Skapa konto', reset: 'Glömt lösenord' }[mode]

  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="font-display text-center text-4xl font-extrabold tracking-wide uppercase">
          Mark<span className="text-accent">kalkyl</span>
        </p>
        <p className="mt-1 mb-6 text-center text-muted">Offerter för mark och schakt, utan handräkning.</p>
        <form onSubmit={submit} className="grid gap-4 rounded-lg border border-line bg-surface p-6">
          <h1 className="font-display text-2xl font-bold uppercase">{title}</h1>
          <Field label="E-post">
            <TextInput id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {mode !== 'reset' && (
            <Field label="Lösenord" hint={mode === 'signup' ? 'Minst 6 tecken' : undefined}>
              <TextInput
                id="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          )}
          {error && <p className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">{error}</p>}
          {info && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{info}</p>}
          <Button type="submit" variant="primary" disabled={busy} className="!py-2.5 !text-base">
            {busy ? 'Vänta…' : { login: 'Logga in', signup: 'Skapa konto', reset: 'Skicka länk' }[mode]}
          </Button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            {mode === 'login' ? (
              <>
                <button type="button" className="font-semibold text-accent" onClick={() => setMode('signup')}>Skapa konto</button>
                <button type="button" className="text-muted hover:text-ink" onClick={() => setMode('reset')}>Glömt lösenord?</button>
              </>
            ) : (
              <button type="button" className="font-semibold text-accent" onClick={() => setMode('login')}>Har du redan konto? Logga in</button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export function NewPasswordView({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(errorText(error.message))
    else onDone()
  }
  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <form onSubmit={submit} className="grid w-full max-w-sm gap-4 rounded-lg border border-line bg-surface p-6">
        <h1 className="font-display text-2xl font-bold uppercase">Välj nytt lösenord</h1>
        <Field label="Nytt lösenord" hint="Minst 6 tecken">
          <TextInput id="new-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">{error}</p>}
        <Button type="submit" variant="primary">Spara lösenord</Button>
      </form>
    </div>
  )
}
