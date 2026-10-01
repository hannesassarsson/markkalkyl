import { useRef, useState } from 'react'
import { Button, Card, Field, TextInput } from '../components/ui'
import type { AppData } from '../lib/store'
import type { Company } from '../lib/types'

type Props = {
  data: AppData
  onCompany: (c: Company) => void
  onImport: (d: AppData) => void
}

export function CompanyView({ data, onCompany, onImport }: Props) {
  const c = data.company
  const set = (patch: Partial<Company>) => onCompany({ ...c, ...patch })
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `markkalkyl-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppData
      if (parsed.version !== 1 || !Array.isArray(parsed.quotes)) throw new Error()
      onImport(parsed)
      setMsg(`Läste in ${parsed.quotes.length} offerter.`)
    } catch {
      setMsg('Filen kunde inte läsas. Välj en säkerhetskopia som exporterats härifrån.')
    }
  }

  return (
    <div className="grid gap-5">
      <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">Företag</h1>
      <Card title="Uppgifter på offerten">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Företagsnamn"><TextInput value={c.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Org.nr"><TextInput value={c.orgNr} onChange={(e) => set({ orgNr: e.target.value })} /></Field>
          <Field label="Adress"><TextInput value={c.address} onChange={(e) => set({ address: e.target.value })} /></Field>
          <Field label="Telefon"><TextInput value={c.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="E-post"><TextInput value={c.email} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="Bankgiro"><TextInput value={c.bankgiro} onChange={(e) => set({ bankgiro: e.target.value })} /></Field>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={c.fSkatt} onChange={(e) => set({ fSkatt: e.target.checked })} className="accent-[var(--color-accent)]" />
          Godkänd för F-skatt
        </label>
      </Card>

      <Card title="Säkerhetskopia">
        <p className="mb-3 max-w-2xl text-sm text-muted">
          Allt sparas i den här webbläsaren. Exportera en säkerhetskopia regelbundet, eller för att flytta offerterna till en annan dator.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportJson}>Exportera</Button>
          <Button onClick={() => fileRef.current?.click()}>Läs in säkerhetskopia</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
          />
        </div>
        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </Card>
    </div>
  )
}
