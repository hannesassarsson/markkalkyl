import { useCallback, useEffect, useRef, useState } from 'react'
import { defaultPrices, uid } from './defaults'
import { buildPublicView } from './publicView'
import { supabase } from './supabase'
import type { Company, Line, PriceList, Quote, QuoteStatus, QuoteTracking, Template } from './types'

export type Member = { userId: string; email: string; role: 'owner' | 'member' }
export type Invite = { email: string; createdAt: string }

export type Workspace = {
  companyId: string
  role: 'owner' | 'member'
  company: Company
  prices: PriceList
  templates: Template[]
  quotes: Quote[]
  members: Member[]
  invites: Invite[]
}

/** Format för säkerhetskopior (samma som den första, lokala versionen) */
export type Backup = {
  version: 1
  company: Company
  prices: PriceList
  quotes: Quote[]
}

type QuoteData = Omit<Quote, 'id' | 'number' | 'status' | 'createdAt' | 'tracking'>

type QuoteRow = {
  id: string
  number: string
  status: QuoteStatus
  data: QuoteData
  created_at: string
  share_token: string | null
  sent_at: string | null
  viewed_at: string | null
  view_count: number
  responded_at: string | null
  response: 'accepted' | 'declined' | null
  response_name: string | null
  response_message: string | null
}

const QUOTE_COLUMNS =
  'id, number, status, data, created_at, share_token, sent_at, viewed_at, view_count, responded_at, response, response_name, response_message'

type CompanyRow = {
  id: string
  name: string
  org_nr: string
  address: string
  phone: string
  email: string
  bankgiro: string
  f_skatt: boolean
  prices: PriceList
  templates: Template[] | null
}

const toTracking = (r: QuoteRow): QuoteTracking => ({
  shareToken: r.share_token,
  sentAt: r.sent_at,
  viewedAt: r.viewed_at,
  viewCount: r.view_count,
  respondedAt: r.responded_at,
  response: r.response,
  responseName: r.response_name,
  responseMessage: r.response_message,
})

const toQuote = (r: QuoteRow): Quote => ({
  ...r.data,
  id: r.id,
  number: r.number,
  status: r.status,
  createdAt: r.created_at,
  tracking: toTracking(r),
})

const quoteData = (q: Quote): QuoteData => {
  const { id: _id, number: _n, status: _s, createdAt: _c, tracking: _t, ...data } = q
  return data
}

const toCompany = (r: CompanyRow): Company => ({
  name: r.name, orgNr: r.org_nr, address: r.address, phone: r.phone, email: r.email, bankgiro: r.bankgiro, fSkatt: r.f_skatt,
})

const companyRow = (c: Company) => ({
  name: c.name, org_nr: c.orgNr, address: c.address, phone: c.phone, email: c.email, bankgiro: c.bankgiro, f_skatt: c.fSkatt,
})

export type SaveState = 'saved' | 'saving' | 'error'

export type LoadState =
  | { status: 'loading' }
  | { status: 'no-company' }
  | { status: 'error'; message: string }
  | { status: 'ready'; ws: Workspace }

const SAVE_DELAY = 600

const check = <T,>(res: { error: { message: string } | null; data?: unknown }) => {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const shareUrl = (token: string) => `${window.location.origin}/#/o/${token}`

export function useWorkspace(userId: string) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pending = useRef(new Map<string, () => Promise<void>>())
  const inFlight = useRef(0)

  const load = useCallback(async () => {
    await supabase.rpc('accept_invites')
    const { data: memberships, error } = await supabase
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', userId)
      .order('created_at')
      .limit(1)
    if (error) return setState({ status: 'error', message: error.message })
    if (!memberships?.length) return setState({ status: 'no-company' })

    const { company_id: companyId, role } = memberships[0] as { company_id: string; role: 'owner' | 'member' }
    const [c, q, m, i] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).single(),
      supabase.from('quotes').select(QUOTE_COLUMNS).eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('company_members').select('user_id, email, role').eq('company_id', companyId).order('created_at'),
      supabase.from('company_invites').select('email, created_at').eq('company_id', companyId).is('accepted_at', null).order('created_at'),
    ])
    const err = c.error ?? q.error ?? m.error ?? i.error
    if (err) return setState({ status: 'error', message: err.message })

    const row = c.data as CompanyRow
    setState({
      status: 'ready',
      ws: {
        companyId,
        role,
        company: toCompany(row),
        prices: row.prices,
        templates: row.templates ?? [],
        quotes: (q.data as QuoteRow[]).map(toQuote),
        members: (m.data ?? []).map((x) => ({ userId: x.user_id, email: x.email, role: x.role })),
        invites: (i.data ?? []).map((x) => ({ email: x.email, createdAt: x.created_at })),
      },
    })
  }, [userId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- laddar data från Supabase vid inloggning
    void load()
  }, [load])

  /** Hämtar offerterna på nytt, t.ex. för att se om en kund har svarat. Hoppar över om något väntar på att sparas. */
  const refreshQuotes = useCallback(async () => {
    if (pending.current.size || inFlight.current) return
    const companyId = state.status === 'ready' ? state.ws.companyId : null
    if (!companyId) return
    const { data, error } = await supabase.from('quotes').select(QUOTE_COLUMNS).eq('company_id', companyId).order('created_at', { ascending: false })
    if (error || pending.current.size || inFlight.current) return
    const quotes = (data as QuoteRow[]).map(toQuote)
    setState((s) => (s.status === 'ready' ? { status: 'ready', ws: { ...s.ws, quotes } } : s))
  }, [state])

  useEffect(() => {
    const onFocus = () => void refreshQuotes()
    const onVisible = () => document.visibilityState === 'visible' && onFocus()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshQuotes])

  // Varna om sidan stängs innan allt hunnit sparas
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (pending.current.size || inFlight.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  /** Kör en sparning och visar status. Returnerar om den lyckades. */
  const run = useCallback(async (task: () => Promise<void>): Promise<boolean> => {
    setSaveState('saving')
    inFlight.current++
    try {
      await task()
      inFlight.current--
      setSaveState(pending.current.size || inFlight.current ? 'saving' : 'saved')
      return true
    } catch (e) {
      inFlight.current--
      console.error(e)
      setSaveState('error')
      return false
    }
  }, [])

  /** Samlar snabba ändringar (t.ex. tangenttryck) till en sparning */
  const schedule = useCallback(
    (key: string, task: () => Promise<void>) => {
      setSaveState('saving')
      pending.current.set(key, task)
      clearTimeout(timers.current.get(key))
      timers.current.set(
        key,
        setTimeout(() => {
          const t = pending.current.get(key)
          pending.current.delete(key)
          timers.current.delete(key)
          if (t) void run(t)
        }, SAVE_DELAY),
      )
    },
    [run],
  )

  const setWs = (fn: (ws: Workspace) => Workspace) =>
    setState((s) => (s.status === 'ready' ? { status: 'ready', ws: fn(s.ws) } : s))

  const ws = state.status === 'ready' ? state.ws : null

  const patchQuote = (id: string, fn: (q: Quote) => Quote) =>
    setWs((w) => ({ ...w, quotes: w.quotes.map((x) => (x.id === id ? fn(x) : x)) }))

  const actions = {
    async createCompany(company: Company) {
      const id = check<string>(await supabase.rpc('create_company', { p_name: company.name, p_prices: defaultPrices }))
      check(await supabase.from('companies').update(companyRow(company)).eq('id', id))
      await load()
    },

    async createQuote(template?: Quote): Promise<Quote | null> {
      if (!ws) return null
      setSaveState('saving')
      try {
        const number = check<string>(await supabase.rpc('next_quote_number', { p_company: ws.companyId }))
        const base: QuoteData = template
          ? { ...structuredClone(quoteData(template)), title: template.title ? `${template.title} (kopia)` : '' }
          : {
              validDays: 30, title: '',
              customer: { name: '', address: '', email: '', phone: '' },
              siteAddress: '', customerType: 'privat', rotPersons: 1,
              notes: 'Priset gäller under förutsättning att marken är fri från berg, ledningar och föroreningar. Tillkommande arbeten debiteras enligt prislista.',
              lines: [],
              prices: structuredClone(ws.prices),
            }
        const row = check<QuoteRow>(
          await supabase
            .from('quotes')
            .insert({ company_id: ws.companyId, number, status: 'utkast', data: base, created_by: userId })
            .select(QUOTE_COLUMNS)
            .single(),
        )
        const quote = toQuote(row)
        setWs((w) => ({ ...w, quotes: [quote, ...w.quotes] }))
        setSaveState('saved')
        return quote
      } catch (e) {
        console.error(e)
        setSaveState('error')
        return null
      }
    },

    /** Sparar offertens innehåll. Kundvyn uppdateras samtidigt så att länken alltid visar senaste versionen. */
    updateQuote(q: Quote) {
      patchQuote(q.id, (old) => ({ ...q, tracking: old.tracking }))
      schedule(`quote:${q.id}`, async () => {
        check(await supabase.from('quotes').update({ data: quoteData(q), public_view: buildPublicView(q) }).eq('id', q.id))
      })
    },

    setStatus(q: Quote, status: QuoteStatus) {
      patchQuote(q.id, (old) => ({ ...old, status }))
      void run(async () => {
        check(await supabase.from('quotes').update({ status }).eq('id', q.id))
      })
    },

    /** Skapar (eller återanvänder) kundlänken och markerar offerten som skickad */
    async shareQuote(q: Quote): Promise<string | null> {
      const token = q.tracking?.shareToken ?? crypto.randomUUID()
      const sentAt = q.tracking?.sentAt ?? new Date().toISOString()
      const status: QuoteStatus = q.status === 'utkast' ? 'skickad' : q.status
      const ok = await run(async () => {
        check(
          await supabase
            .from('quotes')
            .update({ share_token: token, sent_at: sentAt, status, data: quoteData(q), public_view: buildPublicView(q) })
            .eq('id', q.id),
        )
      })
      if (!ok) return null
      patchQuote(q.id, (old) => ({
        ...old,
        status,
        tracking: { ...(old.tracking ?? emptyTracking), shareToken: token, sentAt },
      }))
      return token
    },

    /** Stänger kundlänken. Svar som redan kommit in ligger kvar. */
    unshareQuote(q: Quote) {
      patchQuote(q.id, (old) => ({ ...old, tracking: { ...(old.tracking ?? emptyTracking), shareToken: null } }))
      void run(async () => {
        check(await supabase.from('quotes').update({ share_token: null }).eq('id', q.id))
      })
    },

    deleteQuote(id: string) {
      clearTimeout(timers.current.get(`quote:${id}`))
      pending.current.delete(`quote:${id}`)
      setWs((w) => ({ ...w, quotes: w.quotes.filter((x) => x.id !== id) }))
      void run(async () => {
        check(await supabase.from('quotes').delete().eq('id', id))
      })
    },

    updateCompany(company: Company) {
      if (!ws) return
      setWs((w) => ({ ...w, company }))
      schedule('company', async () => {
        check(await supabase.from('companies').update(companyRow(company)).eq('id', ws.companyId))
      })
    },

    updatePrices(prices: PriceList) {
      if (!ws) return
      setWs((w) => ({ ...w, prices }))
      schedule('prices', async () => {
        check(await supabase.from('companies').update({ prices }).eq('id', ws.companyId))
      })
    },

    saveTemplate(name: string, lines: Line[]) {
      if (!ws) return
      const templates = [...ws.templates, { id: uid(), name, lines: structuredClone(lines) }]
      setWs((w) => ({ ...w, templates }))
      void run(async () => {
        check(await supabase.from('companies').update({ templates }).eq('id', ws.companyId))
      })
    },

    deleteTemplate(id: string) {
      if (!ws) return
      const templates = ws.templates.filter((t) => t.id !== id)
      setWs((w) => ({ ...w, templates }))
      void run(async () => {
        check(await supabase.from('companies').update({ templates }).eq('id', ws.companyId))
      })
    },

    async invite(email: string): Promise<string | null> {
      if (!ws) return null
      const clean = email.trim().toLowerCase()
      const { error } = await supabase.from('company_invites').insert({ company_id: ws.companyId, email: clean, invited_by: userId })
      if (error) return error.code === '23505' ? 'Den adressen är redan inbjuden.' : 'Inbjudan kunde inte sparas. Bara ägaren kan bjuda in.'
      setWs((w) => ({ ...w, invites: [...w.invites, { email: clean, createdAt: new Date().toISOString() }] }))
      return null
    },

    async removeInvite(email: string) {
      if (!ws) return
      setWs((w) => ({ ...w, invites: w.invites.filter((i) => i.email !== email) }))
      await run(async () => {
        check(await supabase.from('company_invites').delete().eq('company_id', ws.companyId).eq('email', email))
      })
    },

    async removeMember(memberId: string) {
      if (!ws) return
      setWs((w) => ({ ...w, members: w.members.filter((m) => m.userId !== memberId) }))
      await run(async () => {
        check(await supabase.from('company_members').delete().eq('company_id', ws.companyId).eq('user_id', memberId))
      })
    },

    /** Läser in offerter från en säkerhetskopia. Offerterna får nya nummer i företagets serie. */
    async importBackup(backup: Backup): Promise<number> {
      if (!ws) return 0
      let n = 0
      for (const q of [...backup.quotes].reverse()) {
        const number = check<string>(await supabase.rpc('next_quote_number', { p_company: ws.companyId }))
        check(await supabase.from('quotes').insert({ company_id: ws.companyId, number, status: q.status, data: quoteData(q), created_by: userId }))
        n++
      }
      await load()
      return n
    },
  }

  return { state, saveState, actions, reload: load }
}

const emptyTracking: QuoteTracking = {
  shareToken: null, sentAt: null, viewedAt: null, viewCount: 0, respondedAt: null, response: null, responseName: null, responseMessage: null,
}
