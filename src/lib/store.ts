import { useCallback, useEffect, useState } from 'react'
import { defaultCompany, defaultPrices, uid } from './defaults'
import type { Company, PriceList, Quote } from './types'

export type AppData = {
  version: 1
  company: Company
  prices: PriceList
  quotes: Quote[]
  nextNumber: number
}

const KEY = 'markkalkyl:v1'

const fresh = (): AppData => ({
  version: 1,
  company: defaultCompany,
  prices: defaultPrices,
  quotes: [],
  nextNumber: 1,
})

export function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh()
    const data = JSON.parse(raw) as AppData
    if (data.version !== 1) return fresh()
    return data
  } catch {
    return fresh()
  }
}

function save(data: AppData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Lagring kan vara blockerad (privat läge). Appen fungerar ändå under sessionen.
  }
}

export function useAppData() {
  const [data, setData] = useState<AppData>(load)

  useEffect(() => save(data), [data])

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), [])

  return { data, update, replace: setData }
}

export function newQuote(data: AppData): { data: AppData; quote: Quote } {
  const year = new Date().getFullYear()
  const quote: Quote = {
    id: uid(),
    number: `${year}-${String(data.nextNumber).padStart(3, '0')}`,
    status: 'utkast',
    createdAt: new Date().toISOString(),
    validDays: 30,
    title: '',
    customer: { name: '', address: '', email: '', phone: '' },
    siteAddress: '',
    customerType: 'privat',
    rotPersons: 1,
    notes:
      'Priset gäller under förutsättning att marken är fri från berg, ledningar och föroreningar. Tillkommande arbeten debiteras enligt prislista.',
    lines: [],
    prices: structuredClone(data.prices),
  }
  return { data: { ...data, quotes: [quote, ...data.quotes], nextNumber: data.nextNumber + 1 }, quote }
}

export function duplicateQuote(data: AppData, source: Quote): { data: AppData; quote: Quote } {
  const { data: d, quote } = newQuote(data)
  const copy: Quote = {
    ...structuredClone(source),
    id: quote.id,
    number: quote.number,
    status: 'utkast',
    createdAt: quote.createdAt,
    title: source.title ? `${source.title} (kopia)` : '',
  }
  return { data: { ...d, quotes: d.quotes.map((q) => (q.id === copy.id ? copy : q)) }, quote: copy }
}
