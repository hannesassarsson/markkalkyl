import { useRef, useState, type FormEvent } from 'react'
import { Button, Card, Field, TextInput } from '../components/ui'
import type { Backup, Workspace } from '../lib/store'
import type { Company } from '../lib/types'

type Props = {
  ws: Workspace
  userId: string
  onCompany: (c: Company) => void
  onInvite: (email: string) => Promise<string | null>
  onRemoveInvite: (email: string) => void
  onRemoveMember: (userId: string) => void
  onImport: (b: Backup) => Promise<number>
}

export function CompanyView({ ws, userId, onCompany, onInvite, onRemoveInvite, onRemoveMember, onImport }: Props) {
  const c = ws.company
  const isOwner = ws.role === 'owner'
  const set = (patch: Partial<Company>) => onCompany({ ...c, ...patch })
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const exportJson = () => {
    const backup: Backup = { version: 1, company: ws.company, prices: ws.prices, quotes: ws.quotes }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `markkalkyl-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Backup
      if (parsed.version !== 1 || !Array.isArray(parsed.quotes)) throw new Error()
      setMsg('Läser in…')
      const n = await onImport(parsed)
      setMsg(`Läste in ${n} offerter.`)
    } catch {
      setMsg('Filen kunde inte läsas. Välj en säkerhetskopia som exporterats från Markkalkyl.')
    }
  }

  const invite = async (e: FormEvent) => {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email.includes('@')) return setInviteMsg('Skriv en giltig e-postadress.')
    const err = await onInvite(email)
    if (err) setInviteMsg(err)
    else {
      setInviteMsg(`${email} är inbjuden. Be dem skapa ett konto med den adressen, så hamnar de direkt i ${c.name}.`)
      setInviteEmail('')
    }
  }

  return (
    <div className="grid gap-5">
      <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">Företag</h1>
      <Card title="Uppgifter på offerten">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Företagsnamn"><TextInput id="c-name" value={c.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Org.nr"><TextInput id="c-org" value={c.orgNr} onChange={(e) => set({ orgNr: e.target.value })} /></Field>
          <Field label="Adress"><TextInput id="c-address" value={c.address} onChange={(e) => set({ address: e.target.value })} /></Field>
          <Field label="Telefon"><TextInput id="c-phone" value={c.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="E-post"><TextInput id="c-email" value={c.email} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="Bankgiro"><TextInput id="c-bg" value={c.bankgiro} onChange={(e) => set({ bankgiro: e.target.value })} /></Field>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input id="c-fskatt" type="checkbox" checked={c.fSkatt} onChange={(e) => set({ fSkatt: e.target.checked })} className="accent-[var(--color-accent)]" />
          Godkänd för F-skatt
        </label>
      </Card>

      <Card title="Användare">
        <ul className="grid gap-1.5">
          {ws.members.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center gap-2 rounded-md bg-white px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-semibold">{m.email}</span>
              <span className="text-xs text-muted">{m.role === 'owner' ? 'Ägare' : 'Medlem'}{m.userId === userId ? ' · du' : ''}</span>
              {isOwner && m.userId !== userId && (
                confirmRemove === m.userId ? (
                  <>
                    <Button variant="danger" onClick={() => { onRemoveMember(m.userId); setConfirmRemove(null) }}>Ja, ta bort</Button>
                    <Button variant="ghost" onClick={() => setConfirmRemove(null)}>Avbryt</Button>
                  </>
                ) : (
                  <Button variant="danger" onClick={() => setConfirmRemove(m.userId)}>Ta bort</Button>
                )
              )}
            </li>
          ))}
          {ws.invites.map((i) => (
            <li key={i.email} className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-line px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{i.email}</span>
              <span className="text-xs text-muted">Inbjuden, inget konto än</span>
              {isOwner && <Button variant="ghost" onClick={() => onRemoveInvite(i.email)}>Ångra</Button>}
            </li>
          ))}
        </ul>
        {isOwner ? (
          <form onSubmit={invite} className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 basis-60">
              <Field label="Bjud in kollega">
                <TextInput id="invite-email" type="email" placeholder="namn@foretag.se" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </Field>
            </div>
            <Button type="submit" variant="primary">Bjud in</Button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-muted">Bara företagets ägare kan bjuda in fler.</p>
        )}
        {inviteMsg && <p className="mt-2 text-sm">{inviteMsg}</p>}
      </Card>

      <Card title="Säkerhetskopia">
        <p className="mb-3 max-w-2xl text-sm text-muted">
          Allt sparas automatiskt i molnet. Du kan även exportera en egen kopia, eller läsa in offerter från en kopia. Inlästa offerter får nya nummer.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportJson}>Exportera</Button>
          <Button onClick={() => fileRef.current?.click()}>Läs in säkerhetskopia</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) void importJson(e.target.files[0])
              e.target.value = ''
            }}
          />
        </div>
        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </Card>
    </div>
  )
}
