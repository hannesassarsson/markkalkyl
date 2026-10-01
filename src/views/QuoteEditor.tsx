import { lazy, Suspense, useState } from 'react'
import { LineEditor, MeasureButton } from '../components/LineEditor'
import { Button, Card, Field, NumberInput, Select, TextInput } from '../components/ui'
import { calcQuote } from '../lib/calc'
import { blankLine, recipes, uid, withMissingRefs, type MeasureKind, type Recipe } from '../lib/defaults'
import { kr } from '../lib/format'
import { kindLabel, statusLabel } from '../lib/labels'
import { shareUrl } from '../lib/store'
import type { Company, CustomerType, Line, PriceList, Quote, QuoteStatus, Template } from '../lib/types'

const MapMeasure = lazy(() => import('../components/MapMeasure'))

const customerTypes: { value: CustomerType; label: string; hint: string }[] = [
  { value: 'privat', label: 'Privatperson', hint: 'Moms 25 % och ROT-avdrag på arbetskostnaden' },
  { value: 'foretag', label: 'Företag', hint: 'Moms 25 %' },
  { value: 'foretag_omvand', label: 'Byggföretag', hint: 'Omvänd betalningsskyldighet för byggmoms' },
]

type Props = {
  quote: Quote
  company: Company
  currentPrices: PriceList
  templates: Template[]
  onChange: (q: Quote) => void
  onStatus: (s: QuoteStatus) => void
  onShare: () => Promise<string | null>
  onUnshare: () => void
  onSaveTemplate: (name: string, lines: Line[]) => void
  onDeleteTemplate: (id: string) => void
  onPrint: () => void
  onDuplicate: () => void
  onDelete: () => void
  onBack: () => void
}

type Measuring = { kind: MeasureKind; apply: (v: number) => void }

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function QuoteEditor(props: Props) {
  const { quote, currentPrices, onChange, onPrint, onDuplicate, onDelete, onBack } = props
  const totals = calcQuote(quote)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [measuring, setMeasuring] = useState<Measuring | null>(null)
  const [showShare, setShowShare] = useState(false)
  const pricesChanged = JSON.stringify(quote.prices) !== JSON.stringify(currentPrices)
  const tr = quote.tracking

  const set = (patch: Partial<Quote>) => onChange({ ...quote, ...patch })
  const setCustomer = (patch: Partial<Quote['customer']>) => set({ customer: { ...quote.customer, ...patch } })
  const setLines = (lines: Line[]) => set({ lines })
  /** Lägger till färdiga rader och fyller på prislistan med det som saknas */
  const appendLines = (lines: Line[]) => set({ lines: [...quote.lines, ...lines], prices: withMissingRefs(quote.prices, lines) })

  const addLine = (kind: Line['kind']) => setLines([...quote.lines, blankLine(kind, quote.prices)])
  const move = (i: number, dir: -1 | 1) => {
    const lines = [...quote.lines]
    ;[lines[i], lines[i + dir]] = [lines[i + dir], lines[i]]
    setLines(lines)
  }
  const measure = (kind: MeasureKind, apply: (v: number) => void) => setMeasuring({ kind, apply })

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={onBack}>← Offerter</Button>
        <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase">Offert {quote.number}</h1>
        <Select
          className="!w-auto"
          value={quote.status}
          onChange={props.onStatus}
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
          <Button onClick={onPrint}>Visa offert</Button>
          <Button variant="primary" onClick={() => setShowShare(true)}>{tr?.shareToken ? 'Kundlänk' : 'Skicka till kund'}</Button>
        </div>
      </div>

      <ResponseBanner quote={quote} />

      {(showShare || tr?.shareToken) && (
        <SharePanel {...props} open={showShare} onOpen={() => setShowShare(true)} onClose={() => setShowShare(false)} />
      )}

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
                <TextInput type="tel" value={quote.customer.phone} onChange={(e) => setCustomer({ phone: e.target.value })} />
              </Field>
              <Field label="E-post">
                <TextInput type="email" value={quote.customer.email} onChange={(e) => setCustomer({ email: e.target.value })} />
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
                  onMeasure={measure}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(kindLabel) as Line['kind'][]).map((k) => (
                <Button key={k} onClick={() => addLine(k)}>+ {kindLabel[k]}</Button>
              ))}
            </div>

            <Packages
              templates={props.templates}
              recipe={recipe}
              setRecipe={setRecipe}
              hasLines={quote.lines.length > 0}
              onRecipe={(values) => {
                if (recipe) appendLines(recipe.build(values, quote.prices))
                setRecipe(null)
              }}
              onTemplate={(t) => appendLines(t.lines.map((l) => ({ ...structuredClone(l), id: uid() })))}
              onSaveTemplate={(name) => props.onSaveTemplate(name, quote.lines)}
              onDeleteTemplate={props.onDeleteTemplate}
              onMeasure={measure}
            />
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
            {pricesChanged && <p className="mt-3 text-xs text-muted">Offerten räknas på prislistan som gällde när den skapades.</p>}
          </Card>
        </aside>
      </div>

      {measuring && (
        <Suspense fallback={null}>
          <MapMeasure
            target={measuring.kind}
            address={quote.siteAddress || quote.customer.address}
            onClose={() => setMeasuring(null)}
            onApply={(v) => {
              measuring.apply(v)
              setMeasuring(null)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

function ResponseBanner({ quote }: { quote: Quote }) {
  const tr = quote.tracking
  if (!tr?.respondedAt) return null
  if (tr.response === 'accepted')
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
        <p className="font-semibold">
          Godkänd av {tr.responseName} {fmtDateTime(tr.respondedAt)}
        </p>
        <p className="text-sm">
          Kunden godkände versionen som visades då. Den versionen är låst på kundlänken, så ändringar du gör nu syns inte för kunden.
        </p>
        {tr.responseMessage && <p className="mt-2 text-sm">Meddelande: ”{tr.responseMessage}”</p>}
      </div>
    )
  return (
    <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-900">
      <p className="font-semibold">Kunden tackade nej {fmtDateTime(tr.respondedAt)}</p>
      {tr.responseMessage ? <p className="text-sm">”{tr.responseMessage}”</p> : <p className="text-sm">Inget meddelande lämnades.</p>}
    </div>
  )
}

function SharePanel({
  quote, company, onShare, onUnshare, open, onOpen, onClose,
}: Props & { open: boolean; onOpen: () => void; onClose: () => void }) {
  const tr = quote.tracking
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [confirmStop, setConfirmStop] = useState(false)
  const url = tr?.shareToken ? shareUrl(tr.shareToken) : null
  const validUntil = new Date(new Date(quote.createdAt).getTime() + quote.validDays * 86_400_000).toLocaleDateString('sv-SE')

  const create = async () => {
    setBusy(true)
    const token = await onShare()
    setBusy(false)
    if (!token) setMsg('Länken kunde inte skapas. Kontrollera internetanslutningen och försök igen.')
  }

  const message = url
    ? [
        `Hej${quote.customer.name ? ` ${quote.customer.name.split(' ')[0]}` : ''}!`,
        '',
        `Här är vår offert${quote.title ? ` på ${quote.title.toLowerCase()}` : ''} (nr ${quote.number}). Du kan läsa den och godkänna den direkt här:`,
        url,
        '',
        `Offerten gäller till ${validUntil}. Hör av dig om du har frågor.`,
        '',
        'Med vänliga hälsningar',
        company.name,
        company.phone,
      ].filter((x) => x !== undefined).join('\n')
    : ''

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMsg(`${what} kopierad.`)
    } catch {
      setMsg('Kunde inte kopiera automatiskt. Markera texten och kopiera själv.')
    }
  }

  if (!open && url)
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm">
        <Tracking quote={quote} />
        <Button variant="ghost" className="ml-auto" onClick={onOpen}>Visa länk</Button>
      </div>
    )

  return (
    <Card title="Skicka till kund" actions={<Button variant="ghost" onClick={onClose}>Stäng</Button>}>
      {!url ? (
        <div className="grid gap-3">
          <p className="max-w-2xl text-sm text-muted">
            Kunden får en länk där offerten visas och kan godkännas med namn, eller avböjas med ett meddelande. Du ser när länken öppnas och när kunden svarar.
            Kunden ser bara moment, mängder och belopp, aldrig era interna priser.
          </p>
          <div>
            <Button variant="primary" disabled={busy} onClick={() => void create()}>{busy ? 'Skapar länk…' : 'Skapa kundlänk'}</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <Tracking quote={quote} />
          <div className="flex flex-wrap gap-2">
            <TextInput readOnly value={url} className="min-w-0 flex-1 basis-72 font-mono text-xs" onFocus={(e) => e.target.select()} aria-label="Kundlänk" />
            <Button onClick={() => void copy(url, 'Länken')}>Kopiera länk</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
              href={`mailto:${encodeURIComponent(quote.customer.email)}?subject=${encodeURIComponent(`Offert ${quote.number} från ${company.name}`)}&body=${encodeURIComponent(message)}`}
            >
              Skicka med e-post
            </a>
            {quote.customer.phone && (
              <a
                className="inline-flex items-center rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:border-ink/40"
                href={`sms:${quote.customer.phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(message)}`}
              >
                Skicka sms
              </a>
            )}
            <Button onClick={() => void copy(message, 'Meddelandet')}>Kopiera meddelande</Button>
            <a className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold text-muted hover:text-ink" href={url} target="_blank" rel="noopener">
              Visa som kund ↗
            </a>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">Förhandsgranska meddelandet</summary>
            <pre className="mt-2 rounded-md bg-white p-3 font-sans whitespace-pre-wrap">{message}</pre>
          </details>
          <p className="text-xs text-muted">
            Ändringar du gör i offerten syns direkt på länken, tills kunden har godkänt.
            {!quote.customer.email && ' Fyll i kundens e-post ovan så hamnar den direkt i mejlet.'}
          </p>
          <div>
            {confirmStop ? (
              <span className="flex flex-wrap items-center gap-2 text-sm">
                Länken slutar fungera för kunden.
                <Button variant="danger" onClick={() => { onUnshare(); setConfirmStop(false); onClose() }}>Stäng länken</Button>
                <Button variant="ghost" onClick={() => setConfirmStop(false)}>Avbryt</Button>
              </span>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmStop(true)}>Stäng kundlänken</Button>
            )}
          </div>
        </div>
      )}
      {msg && <p className="mt-3 text-sm" role="status">{msg}</p>}
    </Card>
  )
}

/** Skickad → öppnad → svar, i en rad */
function Tracking({ quote }: { quote: Quote }) {
  const tr = quote.tracking
  if (!tr?.sentAt) return null
  const steps = [
    `Skickad ${fmtDate(tr.sentAt)}`,
    tr.viewCount > 0 && tr.viewedAt ? `Öppnad ${tr.viewCount} ${tr.viewCount === 1 ? 'gång' : 'gånger'}, senast ${fmtDateTime(tr.viewedAt)}` : 'Inte öppnad än',
    tr.respondedAt ? (tr.response === 'accepted' ? `Godkänd ${fmtDate(tr.respondedAt)}` : `Avböjd ${fmtDate(tr.respondedAt)}`) : null,
  ].filter(Boolean)
  return <p className="text-sm text-muted">{steps.join(' · ')}</p>
}

function Packages({
  templates, recipe, setRecipe, hasLines, onRecipe, onTemplate, onSaveTemplate, onDeleteTemplate, onMeasure,
}: {
  templates: Template[]
  recipe: Recipe | null
  setRecipe: (r: Recipe | null) => void
  hasLines: boolean
  onRecipe: (values: Record<string, number>) => void
  onTemplate: (t: Template) => void
  onSaveTemplate: (name: string) => void
  onDeleteTemplate: (id: string) => void
  onMeasure: (kind: MeasureKind, apply: (v: number) => void) => void
}) {
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [manage, setManage] = useState(false)
  const [saved, setSaved] = useState('')

  return (
    <div className="mt-4 grid gap-3 border-t border-line pt-4">
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Paket</p>
        <div className="flex flex-wrap gap-2">
          {recipes.map((r) => (
            <Button key={r.id} variant={recipe?.id === r.id ? 'primary' : 'secondary'} onClick={() => setRecipe(recipe?.id === r.id ? null : r)}>
              {r.name}
            </Button>
          ))}
        </div>
        {recipe && <RecipeForm key={recipe.id} recipe={recipe} onAdd={onRecipe} onMeasure={onMeasure} />}
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Egna mallar</p>
          {templates.length > 0 && (
            <button type="button" className="text-xs text-muted underline hover:text-ink" onClick={() => setManage(!manage)}>
              {manage ? 'Klar' : 'Hantera'}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {templates.map((t) =>
            manage ? (
              <span key={t.id} className="inline-flex items-center gap-1 rounded-md border border-line bg-white py-1 pr-1 pl-3 text-sm">
                {t.name}
                <Button variant="danger" aria-label={`Ta bort mallen ${t.name}`} onClick={() => onDeleteTemplate(t.id)}>✕</Button>
              </span>
            ) : (
              <Button key={t.id} onClick={() => onTemplate(t)}>{t.name}</Button>
            ),
          )}
          {naming ? (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!name.trim()) return
                onSaveTemplate(name.trim())
                setSaved(`Mallen ”${name.trim()}” är sparad och finns för alla i företaget.`)
                setName('')
                setNaming(false)
              }}
            >
              <TextInput id="template-name" autoFocus placeholder="Mallens namn" value={name} onChange={(e) => setName(e.target.value)} className="!w-56" />
              <Button type="submit" variant="primary" disabled={!name.trim()}>Spara</Button>
              <Button variant="ghost" onClick={() => setNaming(false)}>Avbryt</Button>
            </form>
          ) : (
            <Button variant="ghost" disabled={!hasLines} onClick={() => { setNaming(true); setSaved('') }}>
              + Spara offertens moment som mall
            </Button>
          )}
        </div>
        {saved && <p className="mt-2 text-sm text-muted" role="status">{saved}</p>}
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

function RecipeForm({
  recipe, onAdd, onMeasure,
}: { recipe: Recipe; onAdd: (v: Record<string, number>) => void; onMeasure: (kind: MeasureKind, apply: (v: number) => void) => void }) {
  const [values, setValues] = useState(() => Object.fromEntries(recipe.inputs.map((i) => [i.key, i.default])))
  return (
    <div className="mt-3 grid gap-3 rounded-lg border border-accent/40 bg-accent/5 p-4">
      <p className="text-sm text-muted">{recipe.description}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {recipe.inputs.map((i) => {
          const apply = (v: number) => setValues((vs) => ({ ...vs, [i.key]: v }))
          return (
            <Field key={i.key} label={i.label}>
              <div className="flex gap-1">
                <NumberInput className="min-w-0 flex-1" unit={i.unit} value={values[i.key]} onChange={apply} />
                {i.measure && <MeasureButton label={`Mät ${i.label.toLowerCase()} på karta`} onClick={() => onMeasure(i.measure!, apply)} />}
              </div>
            </Field>
          )
        })}
      </div>
      <div>
        <Button variant="primary" onClick={() => onAdd(values)}>Lägg till {recipe.name.toLowerCase()}</Button>
      </div>
    </div>
  )
}
