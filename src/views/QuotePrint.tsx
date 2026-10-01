import { Button } from '../components/ui'
import { kr, num } from '../lib/format'
import { calcLine, calcQuote, findMaterial } from '../lib/calc'
import type { Company, Line, Quote } from '../lib/types'

/** Kort mängdangivelse som kunden förstår, utan interna kalkylvärden */
function quantityText(line: Line, quote: Quote): string {
  switch (line.kind) {
    case 'schakt':
      return `${num(line.areaM2 * line.depthM)} m³`
    case 'fyllnad':
      return `${num(line.areaM2)} m², ${num(line.thicknessM * 100, 0)} cm`
    case 'artikel':
      return `${num(line.quantity)} ${findMaterial(quote.prices, line.materialId)?.unit ?? ''}`
    case 'maskin':
    case 'arbete':
      return `${num(line.hours)} h`
    case 'fri':
      return `${num(line.quantity)} ${line.unit}`
  }
}

export function QuotePrint({ quote, company, onBack }: { quote: Quote; company: Company; onBack: () => void }) {
  const t = calcQuote(quote)
  const created = new Date(quote.createdAt)
  const validUntil = new Date(created.getTime() + quote.validDays * 86_400_000)
  const d = (x: Date) => x.toLocaleDateString('sv-SE')

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="ghost" onClick={onBack}>← Tillbaka till kalkylen</Button>
        <Button variant="primary" onClick={() => window.print()}>Skriv ut / spara som PDF</Button>
      </div>

      <article className="paper mx-auto w-full max-w-[210mm] bg-white p-[12mm] text-[13px] leading-relaxed text-black shadow-sm ring-1 ring-line print:max-w-none print:p-0 print:shadow-none print:ring-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-black pb-4">
          <div>
            <p className="font-display text-2xl font-extrabold uppercase">{company.name}</p>
            <p className="text-neutral-600">{company.address}</p>
            <p className="text-neutral-600">{company.phone} · {company.email}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-extrabold uppercase">Offert</p>
            <p className="font-mono text-xs">Nr {quote.number}</p>
            <p className="text-neutral-600">Datum {d(created)}</p>
            <p className="text-neutral-600">Giltig till {d(validUntil)}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 py-5">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">Beställare</p>
            <p className="font-semibold">{quote.customer.name || '–'}</p>
            {quote.customer.address && <p>{quote.customer.address}</p>}
            {(quote.customer.phone || quote.customer.email) && (
              <p className="text-neutral-600">{[quote.customer.phone, quote.customer.email].filter(Boolean).join(' · ')}</p>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">Arbetsplats</p>
            <p>{quote.siteAddress || quote.customer.address || '–'}</p>
          </div>
        </section>

        {quote.title && <h2 className="font-display mb-3 text-xl font-bold uppercase">{quote.title}</h2>}

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-black text-left text-[11px] tracking-wider uppercase">
              <th className="py-1.5 font-semibold">Moment</th>
              <th className="py-1.5 pr-3 text-right font-semibold">Mängd</th>
              <th className="py-1.5 text-right font-semibold">Belopp exkl. moms</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((line) => (
              <tr key={line.id} className="border-b border-neutral-200">
                <td className="py-1.5 pr-3">{line.label || '–'}</td>
                <td className="py-1.5 pr-3 text-right whitespace-nowrap tabular-nums">{quantityText(line, quote)}</td>
                <td className="py-1.5 text-right whitespace-nowrap tabular-nums">{kr(calcLine(line, quote.prices).total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto grid w-full max-w-[300px] gap-1 tabular-nums">
          <P label="Summa exkl. moms" value={kr(t.net)} strong />
          {quote.customerType === 'privat' && <P label="Varav arbetskostnad" value={kr(t.breakdown.labor)} />}
          <P label={t.vatRate ? 'Moms 25 %' : 'Moms'} value={t.vatRate ? kr(t.vat) : 'Omvänd'} />
          <P label="Summa inkl. moms" value={kr(t.gross)} />
          {quote.customerType === 'privat' && t.rot > 0 && <P label="Preliminärt ROT-avdrag" value={`−${kr(t.rot)}`} />}
          <div className="mt-1 flex justify-between border-t-2 border-black pt-1.5 text-base font-bold">
            <span>Att betala</span>
            <span>{kr(t.toPay)}</span>
          </div>
        </div>

        <section className="mt-6 grid gap-2 text-[12px] text-neutral-700">
          {quote.customerType === 'foretag_omvand' && (
            <p>Omvänd betalningsskyldighet för byggtjänster gäller. Köparen redovisar momsen.</p>
          )}
          {quote.customerType === 'privat' && (
            <p>
              ROT-avdraget är preliminärt: 30 % av arbetskostnaden inkl. moms, högst 50 000 kr per person och år. Det förutsätter att
              beställaren har avdragsutrymme kvar. Vi ansöker om utbetalningen hos Skatteverket.
            </p>
          )}
          {quote.notes && <p className="whitespace-pre-line">{quote.notes}</p>}
        </section>

        <section className="mt-10 grid grid-cols-2 gap-10 text-[12px]">
          <div className="border-t border-black pt-1">Ort och datum</div>
          <div className="border-t border-black pt-1">Beställarens underskrift</div>
        </section>

        <footer className="mt-10 border-t border-neutral-300 pt-2 text-[11px] text-neutral-500">
          {company.name} · Org.nr {company.orgNr}
          {company.fSkatt && ' · Godkänd för F-skatt'}
          {company.bankgiro && ` · Bankgiro ${company.bankgiro}`}
        </footer>
      </article>
    </div>
  )
}

function P({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-semibold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
