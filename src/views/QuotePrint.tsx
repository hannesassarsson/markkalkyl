import { Button } from '../components/ui'
import { kr } from '../lib/format'
import { buildPublicView } from '../lib/publicView'
import type { Company, PublicView, Quote } from '../lib/types'

type DocProps = {
  view: PublicView
  company: Company
  number: string
  createdAt: string
  /** Visas när kunden har godkänt offerten */
  acceptance?: { name: string; at: string } | null
}

/** Själva offertdokumentet. Används både internt och på kundens länk. */
export function QuoteDocument({ view, company, number, createdAt, acceptance }: DocProps) {
  const t = view.totals
  const created = new Date(createdAt)
  const validUntil = new Date(created.getTime() + view.validDays * 86_400_000)
  const d = (x: Date) => x.toLocaleDateString('sv-SE')

  return (
    <article className="mx-auto w-full max-w-[210mm] min-w-0 bg-white p-[6mm] text-[13px] leading-relaxed text-black shadow-sm ring-1 ring-line sm:p-[12mm] print:max-w-none print:p-0 print:shadow-none print:ring-0">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-black pb-4">
        <div className="min-w-0">
          <p className="font-display text-2xl font-extrabold uppercase">{company.name}</p>
          <p className="text-neutral-600">{company.address}</p>
          <p className="text-neutral-600">{[company.phone, company.email].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-extrabold uppercase">Offert</p>
          <p className="font-mono text-xs">Nr {number}</p>
          <p className="text-neutral-600">Datum {d(created)}</p>
          <p className="text-neutral-600">Giltig till {d(validUntil)}</p>
        </div>
      </header>

      <section className="grid gap-6 py-5 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">Beställare</p>
          <p className="font-semibold">{view.customer.name || '–'}</p>
          {view.customer.address && <p>{view.customer.address}</p>}
          {(view.customer.phone || view.customer.email) && (
            <p className="text-neutral-600">{[view.customer.phone, view.customer.email].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">Arbetsplats</p>
          <p>{view.siteAddress || view.customer.address || '–'}</p>
        </div>
      </section>

      {view.title && <h2 className="font-display mb-3 text-xl font-bold uppercase">{view.title}</h2>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr className="border-b border-black text-left text-[11px] tracking-wider uppercase">
              <th className="py-1.5 font-semibold">Moment</th>
              <th className="py-1.5 pr-3 text-right font-semibold">Mängd</th>
              <th className="py-1.5 text-right font-semibold">Belopp exkl. moms</th>
            </tr>
          </thead>
          <tbody>
            {view.lines.map((line, i) => (
              <tr key={i} className="border-b border-neutral-200">
                <td className="py-1.5 pr-3">{line.label || '–'}</td>
                <td className="py-1.5 pr-3 text-right whitespace-nowrap tabular-nums">{line.quantity}</td>
                <td className="py-1.5 text-right whitespace-nowrap tabular-nums">{kr(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 ml-auto grid w-full max-w-[300px] gap-1 tabular-nums">
        <P label="Summa exkl. moms" value={kr(t.net)} strong />
        {view.customerType === 'privat' && <P label="Varav arbetskostnad" value={kr(t.labor)} />}
        <P label={t.vatRate ? 'Moms 25 %' : 'Moms'} value={t.vatRate ? kr(t.vat) : 'Omvänd'} />
        <P label="Summa inkl. moms" value={kr(t.gross)} />
        {view.customerType === 'privat' && t.rot > 0 && <P label="Preliminärt ROT-avdrag" value={`−${kr(t.rot)}`} />}
        <div className="mt-1 flex justify-between border-t-2 border-black pt-1.5 text-base font-bold">
          <span>Att betala</span>
          <span>{kr(t.toPay)}</span>
        </div>
      </div>

      <section className="mt-6 grid gap-2 text-[12px] text-neutral-700">
        {view.customerType === 'foretag_omvand' && <p>Omvänd betalningsskyldighet för byggtjänster gäller. Köparen redovisar momsen.</p>}
        {view.customerType === 'privat' && (
          <p>
            ROT-avdraget är preliminärt: 30 % av arbetskostnaden inkl. moms, högst 50 000 kr per person och år. Det förutsätter att
            beställaren har avdragsutrymme kvar. Vi ansöker om utbetalningen hos Skatteverket.
          </p>
        )}
        {view.notes && <p className="whitespace-pre-line">{view.notes}</p>}
      </section>

      {acceptance ? (
        <section className="mt-8 rounded border-2 border-emerald-700 p-3 text-[12px]">
          <p className="font-semibold text-emerald-800">Godkänd digitalt</p>
          <p>
            {acceptance.name}, {new Date(acceptance.at).toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </section>
      ) : (
        <section className="mt-10 grid grid-cols-2 gap-10 text-[12px]">
          <div className="border-t border-black pt-1">Ort och datum</div>
          <div className="border-t border-black pt-1">Beställarens underskrift</div>
        </section>
      )}

      <footer className="mt-10 border-t border-neutral-300 pt-2 text-[11px] text-neutral-500">
        {company.name}
        {company.orgNr && ` · Org.nr ${company.orgNr}`}
        {company.fSkatt && ' · Godkänd för F-skatt'}
        {company.bankgiro && ` · Bankgiro ${company.bankgiro}`}
      </footer>
    </article>
  )
}

export function QuotePrint({ quote, company, onBack }: { quote: Quote; company: Company; onBack: () => void }) {
  const tr = quote.tracking
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="ghost" onClick={onBack}>← Tillbaka till kalkylen</Button>
        <Button variant="primary" onClick={() => window.print()}>Skriv ut / spara som PDF</Button>
      </div>
      <QuoteDocument
        view={buildPublicView(quote)}
        company={company}
        number={quote.number}
        createdAt={quote.createdAt}
        acceptance={tr?.response === 'accepted' && tr.responseName && tr.respondedAt ? { name: tr.responseName, at: tr.respondedAt } : null}
      />
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
