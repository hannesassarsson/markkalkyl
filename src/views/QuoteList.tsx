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

const DAY = 86_400_000
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
const ago = (iso: string) => {
  const d = daysSince(iso)
  return d === 0 ? 'i dag' : d === 1 ? 'i går' : `för ${d} dagar sedan`
}
const validUntil = (q: Quote) => new Date(q.createdAt).getTime() + q.validDays * DAY

type FollowUp = { quote: Quote; reason: string; tone: 'good' | 'bad' | 'todo' }

/** Det som behöver göras något åt: nya svar, offerter som inte besvarats och offerter som snart går ut */
function followUps(quotes: Quote[]): FollowUp[] {
  const out: FollowUp[] = []
  for (const q of quotes) {
    const tr = q.tracking
    if (tr?.respondedAt && daysSince(tr.respondedAt) <= 7) {
      out.push(
        tr.response === 'accepted'
          ? { quote: q, tone: 'good', reason: `Godkänd av ${tr.responseName ?? 'kunden'} ${ago(tr.respondedAt)}` }
          : { quote: q, tone: 'bad', reason: `Kunden tackade nej${tr.responseMessage ? `: ”${tr.responseMessage}”` : ''}` },
      )
      continue
    }
    if (q.status !== 'skickad' || tr?.respondedAt) continue
    const left = Math.ceil((validUntil(q) - Date.now()) / DAY)
    if (left >= 0 && left <= 5) out.push({ quote: q, tone: 'todo', reason: `Går ut om ${left} dag${left === 1 ? '' : 'ar'}, inget svar än` })
    else if (tr?.sentAt && daysSince(tr.sentAt) >= 3 && left > 5)
      out.push({
        quote: q,
        tone: 'todo',
        reason: tr.viewCount > 0 ? `Öppnad men inte besvarad, skickad för ${daysSince(tr.sentAt)} dagar sedan` : `Inte öppnad, skickad för ${daysSince(tr.sentAt)} dagar sedan`,
      })
  }
  return out
}

const toneStyle = { good: 'border-l-emerald-600', bad: 'border-l-rose-600', todo: 'border-l-accent' }

/** Kort text om var offerten befinner sig hos kunden */
function customerState(q: Quote) {
  const tr = q.tracking
  if (tr?.response === 'accepted') return 'Godkänd av kund'
  if (tr?.response === 'declined') return 'Avböjd av kund'
  if (tr?.shareToken && tr.viewCount > 0) return `Öppnad ${tr.viewCount}×`
  if (tr?.shareToken) return 'Ej öppnad'
  return null
}

export function QuoteList({ quotes, onOpen, onNew }: { quotes: Quote[]; onOpen: (id: string) => void; onNew: () => void }) {
  const todo = followUps(quotes)
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

      {todo.length > 0 && (
        <section aria-labelledby="todo-h" className="grid gap-2">
          <h2 id="todo-h" className="font-display text-xl font-bold tracking-wide uppercase">Att följa upp</h2>
          <ul className="grid gap-2">
            {todo.map(({ quote: q, reason, tone }) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => onOpen(q.id)}
                  className={`flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-l-4 border-line bg-surface px-4 py-2.5 text-left text-sm hover:bg-white ${toneStyle[tone]}`}
                >
                  <span className="font-mono text-xs">{q.number}</span>
                  <span className="font-semibold">{q.customer.name || 'Namnlös kund'}</span>
                  <span className="min-w-0 flex-1 text-muted">{reason}</span>
                  {tone === 'todo' && q.customer.phone && <span className="text-muted tabular-nums">{q.customer.phone}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

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
                    {customerState(q) && <span className="block pt-1 text-xs text-muted">{customerState(q)}</span>}
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
