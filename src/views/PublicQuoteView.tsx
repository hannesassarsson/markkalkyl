import { useEffect, useState, type FormEvent } from 'react'
import { Button, Field, TextInput } from '../components/ui'
import { kr } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Company, PublicView } from '../lib/types'
import { QuoteDocument } from './QuotePrint'

type Shared = {
  number: string
  created_at: string
  view: PublicView | null
  responded_at: string | null
  response: 'accepted' | 'declined' | null
  response_name: string | null
  company: Company
}

const errorText: Record<string, string> = {
  already_responded: 'Offerten är redan besvarad.',
  expired: 'Offerten har gått ut. Kontakta oss för en uppdaterad offert.',
  name_required: 'Skriv ditt namn för att godkänna.',
  not_found: 'Länken är inte längre aktiv.',
  too_long: 'Meddelandet är för långt.',
}

export function PublicQuoteView({ token }: { token: string }) {
  const [state, setState] = useState<'loading' | 'missing' | 'error' | Shared>('loading')
  const [now] = useState(() => Date.now())

  useEffect(() => {
    supabase.rpc('get_shared_quote', { p_token: token }).then(({ data, error }) => {
      if (error) setState('error')
      else if (!data || !(data as Shared).view) setState('missing')
      else setState(data as Shared)
    })
  }, [token])

  if (state === 'loading') return <div className="grid min-h-full place-items-center text-muted">Hämtar offerten…</div>
  if (state === 'missing' || state === 'error')
    return (
      <div className="grid min-h-full place-items-center px-4 text-center">
        <div className="max-w-md">
          <p className="font-display text-3xl font-extrabold uppercase">
            {state === 'missing' ? 'Offerten finns inte' : 'Något gick fel'}
          </p>
          <p className="mt-2 text-muted">
            {state === 'missing'
              ? 'Länken kan ha stängts eller skrivits fel. Kontakta företaget som skickade den.'
              : 'Offerten kunde inte hämtas just nu. Kontrollera internetanslutningen och ladda om sidan.'}
          </p>
        </div>
      </div>
    )

  const s = state
  const view = s.view!
  const validUntil = new Date(new Date(s.created_at).getTime() + view.validDays * 86_400_000)
  const expired = validUntil.getTime() < now

  return (
    <div className="min-h-full px-3 py-6 sm:px-6 print:p-0">
      <div className="mx-auto grid max-w-[210mm] min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <p className="text-sm text-muted">Offert från {s.company.name}</p>
          <Button onClick={() => window.print()}>Skriv ut / spara som PDF</Button>
        </div>

        <div className="print:hidden">
          <ResponsePanel shared={s} token={token} expired={expired} validUntil={validUntil} onDone={setState} />
        </div>

        <QuoteDocument
          view={view}
          company={s.company}
          number={s.number}
          createdAt={s.created_at}
          acceptance={s.response === 'accepted' && s.response_name && s.responded_at ? { name: s.response_name, at: s.responded_at } : null}
        />

        <p className="pb-6 text-center text-xs text-muted print:hidden">
          Frågor? Kontakta {s.company.name}
          {s.company.phone && <> på <span className="select-all">{s.company.phone}</span></>}
          {s.company.email && <> eller <span className="select-all">{s.company.email}</span></>}.
        </p>
      </div>
    </div>
  )
}

function ResponsePanel({
  shared, token, expired, validUntil, onDone,
}: { shared: Shared; token: string; expired: boolean; validUntil: Date; onDone: (s: Shared) => void }) {
  const view = shared.view!
  const [mode, setMode] = useState<'accept' | 'decline'>('accept')
  const [name, setName] = useState(view.customer.name)
  const [agree, setAgree] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (shared.responded_at) {
    const accepted = shared.response === 'accepted'
    return (
      <div className={`rounded-lg border p-4 ${accepted ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-line bg-surface'}`}>
        <p className="font-display text-2xl font-bold uppercase">{accepted ? 'Tack, offerten är godkänd' : 'Tack för ditt svar'}</p>
        <p className="text-sm">
          {accepted
            ? `Godkänd av ${shared.response_name} ${new Date(shared.responded_at).toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' })}. ${shared.company.name} hör av sig om start.`
            : `Du tackade nej ${new Date(shared.responded_at).toLocaleDateString('sv-SE')}. Hör gärna av dig om något ändras.`}
        </p>
      </div>
    )
  }

  if (expired)
    return (
      <div className="rounded-lg border border-line bg-surface p-4">
        <p className="font-semibold">Offerten gick ut {validUntil.toLocaleDateString('sv-SE')}.</p>
        <p className="text-sm text-muted">Kontakta {shared.company.name} så får du en uppdaterad offert.</p>
      </div>
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'accept' && !agree) return setError('Kryssa i rutan för att bekräfta att du godkänner offerten.')
    setBusy(true)
    const { data, error: err } = await supabase.rpc('respond_to_quote', {
      p_token: token,
      p_response: mode === 'accept' ? 'accepted' : 'declined',
      p_name: name,
      p_message: message,
    })
    setBusy(false)
    if (err) {
      const code = Object.keys(errorText).find((k) => err.message.includes(k))
      setError(code ? errorText[code] : 'Svaret kunde inte skickas. Kontrollera internetanslutningen och försök igen.')
      return
    }
    onDone(data as Shared)
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-display text-2xl font-bold uppercase">Ditt svar</p>
          <p className="text-sm text-muted">
            Att betala {kr(view.totals.toPay)} · Gäller till {validUntil.toLocaleDateString('sv-SE')}
          </p>
        </div>
        <div className="flex rounded-md border border-line bg-white p-0.5 text-sm" role="tablist">
          {(['accept', 'decline'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setError('') }}
              className={`rounded px-3 py-1 font-semibold ${mode === m ? 'bg-ink text-white' : 'text-muted'}`}
            >
              {m === 'accept' ? 'Godkänn' : 'Tacka nej'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'accept' ? (
        <>
          <Field label="Ditt namn">
            <TextInput id="accept-name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input id="accept-agree" type="checkbox" className="mt-1 accent-[var(--color-accent)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            Jag har läst offerten och godkänner den, inklusive villkor och förutsättningar.
          </label>
          <Field label="Meddelande (frivilligt)">
            <textarea
              id="accept-message"
              className="min-h-16 w-full rounded-md border border-line bg-white p-2.5 text-[15px] outline-none focus:border-accent"
              placeholder="T.ex. önskat startdatum"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
        </>
      ) : (
        <Field label="Vill du berätta varför? (frivilligt)">
          <textarea
            id="decline-message"
            className="min-h-20 w-full rounded-md border border-line bg-white p-2.5 text-[15px] outline-none focus:border-accent"
            placeholder="T.ex. valde annan leverantör, priset, tidpunkten"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Field>
      )}

      {error && <p className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">{error}</p>}
      <div>
        <Button type="submit" variant={mode === 'accept' ? 'primary' : 'secondary'} disabled={busy} className="!px-5 !py-2.5 !text-base">
          {busy ? 'Skickar…' : mode === 'accept' ? 'Godkänn offerten' : 'Skicka svar'}
        </Button>
      </div>
    </form>
  )
}
