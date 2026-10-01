import { useEffect, useState } from 'react'
import { duplicateQuote, newQuote, useAppData } from './lib/store'
import { CompanyView } from './views/CompanyView'
import { PriceListView } from './views/PriceListView'
import { QuoteEditor } from './views/QuoteEditor'
import { QuoteList } from './views/QuoteList'
import { QuotePrint } from './views/QuotePrint'

type Route =
  | { page: 'offerter' }
  | { page: 'offert'; id: string }
  | { page: 'utskrift'; id: string }
  | { page: 'prislista' }
  | { page: 'foretag' }

function parseHash(hash: string): Route {
  const [, page, id] = hash.replace(/^#/, '').split('/')
  if ((page === 'offert' || page === 'utskrift') && id) return { page, id }
  if (page === 'prislista' || page === 'foretag') return { page }
  return { page: 'offerter' }
}

const go = (path: string) => {
  window.location.hash = path
}

export default function App() {
  const { data, update, replace } = useAppData()
  const [route, setRoute] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const createQuote = () => {
    const { data: next, quote } = newQuote(data)
    replace(next)
    go(`/offert/${quote.id}`)
  }

  const quote = 'id' in route ? data.quotes.find((q) => q.id === route.id) : undefined

  const nav = [
    { href: '/', label: 'Offerter', active: route.page === 'offerter' || route.page === 'offert' || route.page === 'utskrift' },
    { href: '/prislista', label: 'Prislista', active: route.page === 'prislista' },
    { href: '/foretag', label: 'Företag', active: route.page === 'foretag' },
  ]

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <a href="#/" className="font-display text-2xl font-extrabold tracking-wide uppercase">
            Mark<span className="text-accent">kalkyl</span>
          </a>
          <nav className="flex gap-1" aria-label="Huvudmeny">
            {nav.map((n) => (
              <a
                key={n.href}
                href={`#${n.href}`}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${n.active ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
              >
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 print:p-0">
        {route.page === 'offerter' && <QuoteList quotes={data.quotes} onNew={createQuote} onOpen={(id) => go(`/offert/${id}`)} />}

        {route.page === 'offert' && quote && (
          <QuoteEditor
            quote={quote}
            currentPrices={data.prices}
            onChange={(q) => update((d) => ({ ...d, quotes: d.quotes.map((x) => (x.id === q.id ? q : x)) }))}
            onPrint={() => go(`/utskrift/${quote.id}`)}
            onBack={() => go('/')}
            onDuplicate={() => {
              const { data: next, quote: copy } = duplicateQuote(data, quote)
              replace(next)
              go(`/offert/${copy.id}`)
            }}
            onDelete={() => {
              update((d) => ({ ...d, quotes: d.quotes.filter((x) => x.id !== quote.id) }))
              go('/')
            }}
          />
        )}

        {route.page === 'utskrift' && quote && (
          <QuotePrint quote={quote} company={data.company} onBack={() => go(`/offert/${quote.id}`)} />
        )}

        {'id' in route && !quote && (
          <div className="py-16 text-center">
            <p className="font-display text-2xl font-bold uppercase">Offerten finns inte</p>
            <p className="text-muted">Den kan ha tagits bort, eller sparats i en annan webbläsare.</p>
            <a href="#/" className="mt-3 inline-block font-semibold text-accent">Till offerterna</a>
          </div>
        )}

        {route.page === 'prislista' && <PriceListView prices={data.prices} onChange={(prices) => update((d) => ({ ...d, prices }))} />}

        {route.page === 'foretag' && (
          <CompanyView data={data} onCompany={(company) => update((d) => ({ ...d, company }))} onImport={replace} />
        )}
      </main>
    </div>
  )
}
