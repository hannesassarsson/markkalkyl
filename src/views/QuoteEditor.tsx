import { useState } from 'react'
import { LineEditor } from '../components/LineEditor'
import { Button, Card, Field, NumberInput, Select, TextInput } from '../components/ui'
import { calcQuote } from '../lib/calc'
import { blankLine, recipes, type Recipe } from '../lib/defaults'
import { kr } from '../lib/format'
import { kindLabel, statusLabel } from '../lib/labels'
import type { CustomerType, Line, PriceList, Quote, QuoteStatus } from '../lib/types'

const customerTypes: { value: CustomerType; label: string; hint: string }[] = [
  { value: 'privat', label: 'Privatperson', hint: 'Moms 25 % och ROT-avdrag på arbetskostnaden' },
  { value: 'foretag', label: 'Företag', hint: 'Moms 25 %' },
  { value: 'foretag_omvand', label: 'Byggföretag', hint: 'Omvänd betalningsskyldighet för byggmoms' },
]

type Props = {
  quote: Quote
  currentPrices: PriceList
  onChange: (q: Quote) => void
  onPrint: () => void
  onDuplicate: () => void
  onDelete: () => void
  onBack: () => void
}

export function QuoteEditor({ quote, currentPrices, onChange, onPrint, onDuplicate, onDelete, onBack }: Props) {
  const totals = calcQuote(quote)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const pricesChanged = JSON.stringify(quote.prices) !== JSON.stringify(currentPrices)

  const set = (patch: Partial<Quote>) => onChange({ ...quote, ...patch })
  const setCustomer = (patch: Partial<Quote['customer']>) => set({ customer: { ...quote.customer, ...patch } })
  const setLines = (lines: Line[]) => set({ lines })

  const addLine = (kind: Line['kind']) => setLines([...quote.lines, blankLine(kind, quote.prices)])
  const move = (i: number, dir: -1 | 1) => {
    const lines = [...quote.lines]
    ;[lines[i], lines[i + dir]] = [lines[i + dir], lines[i]]
    setLines(lines)
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={onBack}>← Offerter</Button>
        <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase">Offert {quote.number}</h1>
        <Select
          className="!w-auto"
          value={quote.status}
          onChange={(status) => set({ status })}
          options={Object.entries(statusLabel).map(([value, label]) => ({ value: value as QuoteStatus, label }))}
        />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button onClick={onDuplicate}>Kopiera</Button>
          {confirmDelete ? (
            <>
              <Button variant="danger" onClick={onDelete}>Ja, ta bort</Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Avbryt</Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>Ta bort</Button>
          )}
          <Button variant="primary" onClick={onPrint}>Visa offert →</Button>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 gap-5">
          <Card title="Kund och arbetsplats">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rubrik på offerten">
                <TextInput value={quote.title} placeholder="T.ex. Dränering runt villa" onChange={(e) => set({ title: e.target.value })} />
              </Field>
              <Field label="Arbetsplats">
                <TextInput value={quote.siteAddress} placeholder="Adress eller fastighetsbeteckning" onChange={(e) => set({ siteAddress: e.target.value })} />
              </Field>
              <Field label="Kund">
                <TextInput value={quote.customer.name} autoComplete="off" onChange={(e) => setCustomer({ name: e.target.value })} />
              </Field>
              <Field label="Telefon">
                <TextInput value={quote.customer.phone} onChange={(e) => setCustomer({ phone: e.target.value })} />
              </Field>
              <Field label="E-post">
                <TextInput value={quote.customer.email} onChange={(e) => setCustomer({ email: e.target.value })} />
              </Field>
              <Field label="Kundens adress">
                <TextInput value={quote.customer.address} onChange={(e) => setCustomer({ address: e.target.value })} />
              </Field>
            </div>
            <fieldset className="mt-4 grid gap-2">
              <legend className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Kundtyp</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {customerTypes.map((t) => (
                  <label
                    key={t.value}
                    className={`cursor-pointer rounded-md border p-2.5 text-sm transition ${
                      quote.customerType === t.value ? 'border-accent bg-accent/5' : 'border-line bg-white hover:border-ink/30'
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name="customerType"
                      checked={quote.customerType === t.value}
                      onChange={() => set({ customerType: t.value })}
                    />
                    <span className="block font-semibold">{t.label}</span>
                    <span className="text-xs text-muted">{t.hint}</span>
                  </label>
                ))}
              </div>
              {quote.customerType === 'privat' && (
                <div className="max-w-xs">
                  <Field label="Personer som delar ROT" hint="Max 50 000 kr ROT per person och år">
                    <NumberInput value={quote.rotPersons} onChange={(v) => set({ rotPersons: Math.max(1, Math.round(v)) })} />
                  </Field>
                </div>
              )}
            </fieldset>
          </Card>

          <Card
            title="Moment"
            actions={
              pricesChanged && (
                <Button onClick={() => set({ prices: structuredClone(currentPrices) })}>Uppdatera till aktuell prislista</Button>
              )
            }
          >
            <div className="grid gap-3">
              {quote.lines.length === 0 && (
                <p className="rounded-lg border border-dashed border-line p-6 text-center text-muted">
                  Lägg till moment nedan, eller börja med ett paket för ett vanligt jobb.
                </p>
              )}
              {quote.lines.map((line, i) => (
                <LineEditor
                  key={line.id}
                  line={line}
                  prices={quote.prices}
                  isFirst={i === 0}
                  isLast={i === quote.lines.length - 1}
                  onChange={(l) => setLines(quote.lines.map((x) => (x.id === l.id ? l : x)))}
                  onRemove={() => setLines(quote.lines.filter((x) => x.id !== line.id))}
                  onMove={(dir) => move(i, dir)}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(kindLabel) as Line['kind'][]).map((k) => (
                <Button key={k} onClick={() => addLine(k)}>+ {kindLabel[k]}</Button>
              ))}
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Paket</p>
              <div className="flex flex-wrap gap-2">
                {recipes.map((r) => (
                  <Button key={r.id} variant={recipe?.id === r.id ? 'primary' : 'secondary'} onClick={() => setRecipe(recipe?.id === r.id ? null : r)}>
                    {r.name}
                  </Button>
                ))}
              </div>
              {recipe && (
                <RecipeForm
                  key={recipe.id}
                  recipe={recipe}
                  onAdd={(values) => {
                    setLines([...quote.lines, ...recipe.build(values, quote.prices)])
                    setRecipe(null)
                  }}
                />
              )}
            </div>
          </Card>

          <Card title="Villkor och förutsättningar">
            <textarea
              className="min-h-24 w-full rounded-md border border-line bg-white p-2.5 text-[15px] outline-none focus:border-accent"
              value={quote.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
            <div className="mt-3 max-w-[200px]">
              <Field label="Giltig i">
                <NumberInput unit="dagar" value={quote.validDays} onChange={(v) => set({ validDays: Math.round(v) })} />
              </Field>
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20">
          <Card title="Summering">
            <dl className="grid gap-1.5 text-sm tabular-nums">
              <Row label="Arbete" value={totals.breakdown.labor} />
              <Row label="Maskin" value={totals.breakdown.machine} />
              <Row label="Material" value={totals.breakdown.material} />
              <Row label="Tippavgifter" value={totals.breakdown.disposal} />
              {totals.breakdown.other > 0 && <Row label="Övrigt" value={totals.breakdown.other} />}
              <div className="my-1.5 border-t border-line" />
              <Row label="Summa exkl. moms" value={totals.net} strong />
              <Row label={totals.vatRate ? 'Moms 25 %' : 'Moms (omvänd)'} value={totals.vat} />
              <Row label="Summa inkl. moms" value={totals.gross} />
              {quote.customerType === 'privat' && (
                <>
                  <Row label="Preliminärt ROT-avdrag" value={-totals.rot} />
                  {totals.rotCapped && <p className="text-xs text-warn">ROT är begränsat till taket på 50 000 kr per person.</p>}
                </>
              )}
            </dl>
            <div className="mt-4 rounded-md bg-ink p-3 text-white">
              <p className="text-xs tracking-wide uppercase opacity-70">Kunden betalar</p>
              <p className="font-display text-3xl font-extrabold tabular-nums">{kr(totals.toPay)}</p>
            </div>
            {pricesChanged && (
              <p className="mt-3 text-xs text-muted">Offerten räknas på prislistan som gällde när den skapades.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'font-semibold' : ''}`}>
      <dt className="text-muted">{label}</dt>
      <dd>{kr(value)}</dd>
    </div>
  )
}

function RecipeForm({ recipe, onAdd }: { recipe: Recipe; onAdd: (v: Record<string, number>) => void }) {
  const [values, setValues] = useState(() => Object.fromEntries(recipe.inputs.map((i) => [i.key, i.default])))
  return (
    <div className="mt-3 grid gap-3 rounded-lg border border-accent/40 bg-accent/5 p-4">
      <p className="text-sm text-muted">{recipe.description}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {recipe.inputs.map((i) => (
          <Field key={i.key} label={i.label}>
            <NumberInput unit={i.unit} value={values[i.key]} onChange={(v) => setValues({ ...values, [i.key]: v })} />
          </Field>
        ))}
      </div>
      <div>
        <Button variant="primary" onClick={() => onAdd(values)}>Lägg till {recipe.name.toLowerCase()}</Button>
      </div>
    </div>
  )
}
