import { Button, Card, Field, NumberInput, Select, TextInput } from '../components/ui'
import { uid } from '../lib/defaults'
import type { MaterialUnit, PriceList } from '../lib/types'

const units: { value: MaterialUnit; label: string }[] = [
  { value: 'ton', label: 'ton' },
  { value: 'm', label: 'm' },
  { value: 'm²', label: 'm²' },
  { value: 'st', label: 'st' },
]

const th = 'px-2 py-2 text-left text-xs font-semibold tracking-wide text-muted uppercase'
const td = 'px-2 py-1.5 align-top'

export function PriceListView({ prices, onChange }: { prices: PriceList; onChange: (p: PriceList) => void }) {
  const set = (patch: Partial<PriceList>) => onChange({ ...prices, ...patch })

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">Prislista</h1>
        <p className="max-w-2xl text-muted">
          Priserna här används för nya offerter. Skickade offerter behåller priserna de skapades med. Siffrorna från början är exempel, byt dem mot era egna.
        </p>
      </div>

      <Card title="Grundinställningar">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label="Handarbete"><NumberInput unit="kr/h" value={prices.laborRate} onChange={(v) => set({ laborRate: v })} /></Field>
          <Field label="Påslag material"><NumberInput unit="%" value={prices.materialMarkupPct} onChange={(v) => set({ materialMarkupPct: v })} /></Field>
          <Field label="Lastbil för bortforsling">
            <Select value={prices.truckId} onChange={(v) => set({ truckId: v })} options={prices.machines.map((m) => ({ value: m.id, label: m.name }))} />
          </Field>
          <Field label="Last per lass"><NumberInput unit="ton" value={prices.truckCapacityTon} onChange={(v) => set({ truckCapacityTon: v })} /></Field>
          <Field label="Avrunda timmar uppåt" hint="0 = ingen avrundning">
            <NumberInput unit="h" value={prices.hourRoundingStep} onChange={(v) => set({ hourRoundingStep: v })} />
          </Field>
        </div>
      </Card>

      <Card
        title="Maskiner"
        actions={<Button onClick={() => set({ machines: [...prices.machines, { id: uid(), name: 'Ny maskin', hourlyRate: 0, laborShare: 0 }] })}>+ Maskin</Button>}
      >
        <p className="mb-3 text-sm text-muted">Ange hur stor del av timpriset som är förarens arbete. Den delen räknas som arbetskostnad för ROT.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead><tr><th className={th}>Maskin</th><th className={th}>Timpris</th><th className={th}>Varav förare</th><th /></tr></thead>
            <tbody>
              {prices.machines.map((m, i) => {
                const upd = (patch: Partial<typeof m>) => set({ machines: prices.machines.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
                return (
                  <tr key={m.id}>
                    <td className={td}><TextInput aria-label="Maskin" value={m.name} onChange={(e) => upd({ name: e.target.value })} /></td>
                    <td className={`${td} w-36`}><NumberInput unit="kr/h" value={m.hourlyRate} onChange={(v) => upd({ hourlyRate: v })} /></td>
                    <td className={`${td} w-36`}><NumberInput unit="kr/h" value={m.laborShare} onChange={(v) => upd({ laborShare: v })} /></td>
                    <td className={`${td} w-10`}>
                      <Button variant="danger" aria-label={`Ta bort ${m.name}`} disabled={m.id === prices.truckId} onClick={() => set({ machines: prices.machines.filter((x) => x.id !== m.id) })}>✕</Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Material"
        actions={<Button onClick={() => set({ materials: [...prices.materials, { id: uid(), name: 'Nytt material', unit: 'ton', price: 0, density: 1.8 }] })}>+ Material</Button>}
      >
        <p className="mb-3 text-sm text-muted">Ton-varor räknas från yta × tjocklek × densitet i packat lager. Frakt per ton läggs till om leverantören inte kör fritt.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead><tr><th className={th}>Material</th><th className={th}>Enhet</th><th className={th}>Inköpspris</th><th className={th}>Densitet</th><th className={th}>Frakt</th><th /></tr></thead>
            <tbody>
              {prices.materials.map((m, i) => {
                const upd = (patch: Partial<typeof m>) => set({ materials: prices.materials.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
                return (
                  <tr key={m.id}>
                    <td className={td}><TextInput aria-label="Material" value={m.name} onChange={(e) => upd({ name: e.target.value })} /></td>
                    <td className={`${td} w-24`}><Select value={m.unit} options={units} onChange={(v) => upd({ unit: v, density: v === 'ton' ? (m.density ?? 1.8) : undefined })} /></td>
                    <td className={`${td} w-36`}><NumberInput unit={`kr/${m.unit}`} value={m.price} onChange={(v) => upd({ price: v })} /></td>
                    <td className={`${td} w-32`}>{m.unit === 'ton' && <NumberInput unit="t/m³" value={m.density ?? 0} onChange={(v) => upd({ density: v })} />}</td>
                    <td className={`${td} w-32`}>{m.unit === 'ton' && <NumberInput unit="kr/t" value={m.freightPerTon ?? 0} onChange={(v) => upd({ freightPerTon: v })} />}</td>
                    <td className={`${td} w-10`}><Button variant="danger" aria-label={`Ta bort ${m.name}`} onClick={() => set({ materials: prices.materials.filter((x) => x.id !== m.id) })}>✕</Button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Tippavgifter"
        actions={<Button onClick={() => set({ disposals: [...prices.disposals, { id: uid(), name: 'Ny masstyp', pricePerTon: 0 }] })}>+ Masstyp</Button>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead><tr><th className={th}>Masstyp</th><th className={th}>Avgift</th><th /></tr></thead>
            <tbody>
              {prices.disposals.map((d, i) => {
                const upd = (patch: Partial<typeof d>) => set({ disposals: prices.disposals.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
                return (
                  <tr key={d.id}>
                    <td className={td}><TextInput aria-label="Masstyp" value={d.name} onChange={(e) => upd({ name: e.target.value })} /></td>
                    <td className={`${td} w-36`}><NumberInput unit="kr/t" value={d.pricePerTon} onChange={(v) => upd({ pricePerTon: v })} /></td>
                    <td className={`${td} w-10`}><Button variant="danger" aria-label={`Ta bort ${d.name}`} onClick={() => set({ disposals: prices.disposals.filter((x) => x.id !== d.id) })}>✕</Button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
