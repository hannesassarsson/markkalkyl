import { useState, type FormEvent } from 'react'
import { Button, Field, TextInput } from '../components/ui'
import type { Company } from '../lib/types'

export function OnboardingView({ email, onCreate, onSignOut }: { email: string; onCreate: (c: Company) => Promise<void>; onSignOut: () => void }) {
  const [c, setC] = useState<Company>({ name: '', orgNr: '', address: '', phone: '', email, bankgiro: '', fSkatt: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (patch: Partial<Company>) => setC({ ...c, ...patch })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onCreate(c)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Företaget kunde inte skapas.')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <form onSubmit={submit} className="grid w-full max-w-lg gap-4 rounded-lg border border-line bg-surface p-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase">Lägg upp ditt företag</h1>
          <p className="mt-1 text-muted">
            Uppgifterna hamnar på offerterna. Ska du jobba i en kollegas företag? Be dem bjuda in {email}, och logga sedan in igen.
          </p>
        </div>
        <Field label="Företagsnamn">
          <TextInput id="company-name" required value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="T.ex. J&L Schakt och Entreprenad AB" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Org.nr"><TextInput id="company-org" value={c.orgNr} onChange={(e) => set({ orgNr: e.target.value })} /></Field>
          <Field label="Telefon"><TextInput id="company-phone" value={c.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="E-post"><TextInput id="company-email" value={c.email} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="Adress"><TextInput id="company-address" value={c.address} onChange={(e) => set({ address: e.target.value })} /></Field>
        </div>
        {error && <p className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="submit" variant="primary" disabled={busy || !c.name.trim()}>{busy ? 'Skapar…' : 'Skapa företag'}</Button>
          <Button variant="ghost" onClick={onSignOut}>Logga ut</Button>
        </div>
      </form>
    </div>
  )
}
