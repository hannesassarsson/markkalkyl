import { Button } from '../components/ui'
import { kr } from '../lib/format'
import { statusLabel } from '../lib/labels'
import { calcQuote } from '../lib/calc'
import type { Quote, QuoteStatus } from '../lib/types'

const statusStyle: Record<QuoteStatus, string> = {
  utkast: 'bg-ink/[.07] text-muted',
  skickad: 'bg-sky-100 text-sky-800',
  accepterad: 'bg-emerald-100 text-emerald-800',
  forlorad: 'bg-rose-100 text-rose-800',
}

export function QuoteList({ quotes, onOpen, onNew }: { quotes: Quote[]; onOpen: (id: string) => void; onNew: () => void }) {
  const sent = quotes.filter((q) => q.status !== 'utkast')
  const won = quotes.filter((q) => q.status === 'accepterad')
  const wonValue = won.reduce((s, q) => s + calcQuote(q).net, 0)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">Offerter</h1>
          <p className="text-muted">
            {quotes.length} offerter · {won.length} av {sent.length} skickade accepterade · {kr(wonValue)} vunnet exkl. moms
          </p>
        </div>
        <Button variant="primary" className="!px-4 !py-2 !text-base" onClick={onNew}>+ Ny offert</Button>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface p-10 text-center">
          <p className="font-display text-2xl font-bold uppercase">Inga offerter än</p>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Skapa en offert och lägg till schakt, fyllnad och maskintid. Mängder, lass, tipp, moms och ROT räknas ut medan du skriver.
          </p>
          <Button variant="primary" className="mt-4" onClick={onNew}>Skapa första offerten</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Nr</th>
                <th className="px-4 py-2.5 font-semibold">Kund / rubrik</th>
                <th className="px-4 py-2.5 font-semibold">Datum</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold">Exkl. moms</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr
                  key={q.id}
                  tabIndex={0}
                  className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-white focus:bg-white focus:outline-none"
                  onClick={() => onOpen(q.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onOpen(q.id)}
                >
                  <td className="px-4 py-3 font-mono text-xs">{q.number}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">{q.customer.name || 'Namnlös kund'}</span>
                    {q.title && <span className="block text-muted">{q.title}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted tabular-nums">{new Date(q.createdAt).toLocaleDateString('sv-SE')}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[q.status]}`}>{statusLabel[q.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{kr(calcQuote(q).net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
