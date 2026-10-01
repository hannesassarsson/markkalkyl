import { useCallback, useEffect, useRef, useState } from 'react'
import { defaultPrices } from './defaults'
import { supabase } from './supabase'
import type { Company, PriceList, Quote, QuoteStatus } from './types'

export type Member = { userId: string; email: string; role: 'owner' | 'member' }
export type Invite = { email: string; createdAt: string }

export type Workspace = {
  companyId: string
  role: 'owner' | 'member'
  company: Company
  prices: PriceList
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

type QuoteRow = {
  id: string
  number: string
  status: QuoteStatus
  data: Omit<Quote, 'id' | 'number' | 'status' | 'createdAt'>
  created_at: string
}

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
}

const toQuote = (r: QuoteRow): Quote => ({ ...r.data, id: r.id, number: r.number, status: r.status, createdAt: r.created_at })

const quoteData = (q: Quote): QuoteRow['data'] => {
  const { id: _id, number: _n, status: _s, createdAt: _c, ...data } = q
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

export function useWorkspace(userId: string) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pending = useRef(new Map<string, () => Promise<void>>())

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
      supabase.from('quotes').select('id, number, status, data, created_at').eq('company_id', companyId).order('created_at', { ascending: false }),
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

  // Varna om sidan stängs innan allt hunnit sparas
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (pending.current.size) e.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  const run = useCallback(async (task: () => Promise<void>) => {
    setSaveState('saving')
    try {
      await task()
      setSaveState(pending.current.size ? 'saving' : 'saved')
    } catch (e) {
      console.error(e)
      setSaveState('error')
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

  const check = <T,>(res: { error: { message: string } | null; data?: unknown }) => {
    if (res.error) throw new Error(res.error.message)
    return res.data as T
  }

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
        const base: Quote = template
          ? { ...structuredClone(template), title: template.title ? `${template.title} (kopia)` : '' }
          : {
              id: '', number, status: 'utkast', createdAt: '', validDays: 30, title: '',
              customer: { name: '', address: '', email: '', phone: '' },
              siteAddress: '', customerType: 'privat', rotPersons: 1,
              notes: 'Priset gäller under förutsättning att marken är fri från berg, ledningar och föroreningar. Tillkommande arbeten debiteras enligt prislista.',
              lines: [],
              prices: structuredClone(ws.prices),
            }
        const row = check<QuoteRow>(
          await supabase
            .from('quotes')
            .insert({ company_id: ws.companyId, number, status: 'utkast', data: quoteData(base), created_by: userId })
            .select('id, number, status, data, created_at')
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

    updateQuote(q: Quote) {
      setWs((w) => ({ ...w, quotes: w.quotes.map((x) => (x.id === q.id ? q : x)) }))
      schedule(`quote:${q.id}`, async () => {
        check(await supabase.from('quotes').update({ status: q.status, data: quoteData(q) }).eq('id', q.id))
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
