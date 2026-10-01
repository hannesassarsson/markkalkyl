import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Button } from './components/ui'
import { useWorkspace, type SaveState } from './lib/store'
import { supabase } from './lib/supabase'
import { AuthView, NewPasswordView } from './views/AuthView'
import { CompanyView } from './views/CompanyView'
import { OnboardingView } from './views/OnboardingView'
import { PriceListView } from './views/PriceListView'
import { PublicQuoteView } from './views/PublicQuoteView'
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

/** Kundlänkar har formen #/o/<token> och visas utan inloggning */
const publicToken = (hash: string) => hash.match(/^#\/o\/([0-9a-f-]{36})$/i)?.[1] ?? null

export default function App() {
  const [token, setToken] = useState(() => publicToken(window.location.hash))
  useEffect(() => {
    const onHash = () => setToken(publicToken(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  if (token) return <PublicQuoteView key={token} token={token} />
  return <SignedInApp />
}

function SignedInApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Splash />
  if (!session) return <AuthView />
  if (recovering) return <NewPasswordView onDone={() => setRecovering(false)} />
  return <Workspace key={session.user.id} userId={session.user.id} email={session.user.email ?? ''} />
}

function Splash({ text = 'Laddar…' }: { text?: string }) {
  return <div className="grid min-h-full place-items-center text-muted">{text}</div>
}

const saveText: Record<SaveState, string> = { saved: 'Sparat', saving: 'Sparar…', error: 'Kunde inte spara' }

function Workspace({ userId, email }: { userId: string; email: string }) {
  const { state, saveState, actions, reload } = useWorkspace(userId)
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  const signOut = () => void supabase.auth.signOut()

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (state.status === 'loading') return <Splash />
  if (state.status === 'error')
    return (
      <div className="grid min-h-full place-items-center px-4 text-center">
        <div>
          <p className="font-display text-2xl font-bold uppercase">Kunde inte hämta data</p>
          <p className="text-muted">{state.message}</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button variant="primary" onClick={() => void reload()}>Försök igen</Button>
            <Button variant="ghost" onClick={signOut}>Logga ut</Button>
          </div>
        </div>
      </div>
    )
  if (state.status === 'no-company') return <OnboardingView email={email} onCreate={actions.createCompany} onSignOut={signOut} />

  const ws = state.ws
  const quote = 'id' in route ? ws.quotes.find((q) => q.id === route.id) : undefined

  const createQuote = async () => {
    const q = await actions.createQuote()
    if (q) go(`/offert/${q.id}`)
  }

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
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span
              role="status"
              className={`text-xs ${saveState === 'error' ? 'font-semibold text-warn' : 'text-muted'}`}
              title={saveState === 'error' ? 'Kontrollera internetanslutningen. Ändringen sparas vid nästa redigering.' : undefined}
            >
              {saveText[saveState]}
            </span>
            <span className="hidden text-muted md:inline">{ws.company.name}</span>
            <Button variant="ghost" onClick={signOut}>Logga ut</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 print:p-0">
        {route.page === 'offerter' && <QuoteList quotes={ws.quotes} onNew={() => void createQuote()} onOpen={(id) => go(`/offert/${id}`)} />}

        {route.page === 'offert' && quote && (
          <QuoteEditor
            quote={quote}
            company={ws.company}
            currentPrices={ws.prices}
            templates={ws.templates}
            onChange={actions.updateQuote}
            onStatus={(st) => actions.setStatus(quote, st)}
            onShare={() => actions.shareQuote(quote)}
            onUnshare={() => actions.unshareQuote(quote)}
            onSaveTemplate={actions.saveTemplate}
            onDeleteTemplate={actions.deleteTemplate}
            onPrint={() => go(`/utskrift/${quote.id}`)}
            onBack={() => go('/')}
            onDuplicate={async () => {
              const copy = await actions.createQuote(quote)
              if (copy) go(`/offert/${copy.id}`)
            }}
            onDelete={() => {
              actions.deleteQuote(quote.id)
              go('/')
            }}
          />
        )}

        {route.page === 'utskrift' && quote && <QuotePrint quote={quote} company={ws.company} onBack={() => go(`/offert/${quote.id}`)} />}

        {'id' in route && !quote && (
          <div className="py-16 text-center">
            <p className="font-display text-2xl font-bold uppercase">Offerten finns inte</p>
            <p className="text-muted">Den kan ha tagits bort.</p>
            <a href="#/" className="mt-3 inline-block font-semibold text-accent">Till offerterna</a>
          </div>
        )}

        {route.page === 'prislista' && <PriceListView prices={ws.prices} onChange={actions.updatePrices} />}

        {route.page === 'foretag' && (
          <CompanyView
            ws={ws}
            userId={userId}
            onCompany={actions.updateCompany}
            onInvite={actions.invite}
            onRemoveInvite={(e) => void actions.removeInvite(e)}
            onRemoveMember={(id) => void actions.removeMember(id)}
            onImport={actions.importBackup}
          />
        )}
      </main>
    </div>
  )
}
