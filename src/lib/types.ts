export type Machine = {
  id: string
  name: string
  /** Timpris inkl. förare, kr/h exkl. moms */
  hourlyRate: number
  /** Den del av timpriset som är arbetskostnad (förarens lön), kr/h. Grund för ROT. */
  laborShare: number
}

export type MaterialUnit = 'ton' | 'm' | 'st' | 'm²'

export type Material = {
  id: string
  name: string
  unit: MaterialUnit
  /** Inköpspris per enhet, kr exkl. moms */
  price: number
  /** Endast för ton-varor: densitet i färdigt, packat lager, ton/m³ */
  density?: number
  /** Endast för ton-varor: frakt per ton om leverantören inte kör fritt */
  freightPerTon?: number
}

export type Disposal = {
  id: string
  name: string
  /** Tippavgift, kr/ton */
  pricePerTon: number
}

export type PriceList = {
  machines: Machine[]
  materials: Material[]
  disposals: Disposal[]
  /** Maskinen som används för bortforsling */
  truckId: string
  /** Lastkapacitet per lass, ton */
  truckCapacityTon: number
  /** Handarbete, kr/h (helt arbetskostnad) */
  laborRate: number
  /** Påslag på material, procent */
  materialMarkupPct: number
  /** Avrunda maskintimmar uppåt till närmaste steg (t.ex. 0,5 h). 0 = ingen avrundning */
  hourRoundingStep: number
}

export type ExcavationLine = {
  kind: 'schakt'
  id: string
  label: string
  areaM2: number
  depthM: number
  /** Densitet på fasta massor, ton/m³ */
  soilDensity: number
  /** Svällningsfaktor fast → löst */
  swellFactor: number
  machineId: string
  /** Schaktkapacitet, m³ fast per timme */
  capacityM3h: number
  /** null = massorna ligger kvar på platsen */
  disposalId: string | null
  /** Tid per lass tur och retur inkl. tömning, h */
  roundTripH: number
}

export type FillLine = {
  kind: 'fyllnad'
  id: string
  label: string
  areaM2: number
  thicknessM: number
  materialId: string
  machineId: string
  /** Utläggning och packning, m³ per timme */
  capacityM3h: number
}

export type ArticleLine = {
  kind: 'artikel'
  id: string
  label: string
  materialId: string
  quantity: number
}

export type MachineLine = {
  kind: 'maskin'
  id: string
  label: string
  machineId: string
  hours: number
}

export type LaborLine = {
  kind: 'arbete'
  id: string
  label: string
  hours: number
}

export type CustomLine = {
  kind: 'fri'
  id: string
  label: string
  quantity: number
  unit: string
  unitPrice: number
  category: 'arbete' | 'material' | 'ovrigt'
}

export type Line = ExcavationLine | FillLine | ArticleLine | MachineLine | LaborLine | CustomLine

export type CustomerType = 'privat' | 'foretag' | 'foretag_omvand'

export type QuoteStatus = 'utkast' | 'skickad' | 'accepterad' | 'forlorad'

export type Quote = {
  id: string
  number: string
  status: QuoteStatus
  createdAt: string
  validDays: number
  title: string
  customer: {
    name: string
    address: string
    email: string
    phone: string
  }
  siteAddress: string
  customerType: CustomerType
  /** Antal personer som delar på ROT-avdraget (privatkund) */
  rotPersons: number
  notes: string
  lines: Line[]
  /** Prislistan låses när offerten skapas så att senare prisändringar inte flyttar en skickad offert */
  prices: PriceList
  /** Utskick och kundens svar. Sätts av databasen, sparas inte med innehållet. */
  tracking?: QuoteTracking
}

export type Company = {
  name: string
  orgNr: string
  address: string
  phone: string
  email: string
  bankgiro: string
  fSkatt: boolean
}

/** Kostnadsuppdelning för en rad, kr exkl. moms */
export type Breakdown = {
  labor: number
  machine: number
  material: number
  disposal: number
  other: number
}

export type LineResult = {
  total: number
  breakdown: Breakdown
  /** Arbetskostnad som grundar ROT, kr exkl. moms */
  rotBase: number
  /** Mänskligt läsbar härledning, t.ex. "12,0 m³ fast → 15,0 m³ löst → 22,8 t → 2 lass" */
  details: string[]
}

export type QuoteTotals = {
  breakdown: Breakdown
  net: number
  vatRate: number
  vat: number
  gross: number
  rotBaseInclVat: number
  rot: number
  rotCapped: boolean
  toPay: number
}

/** Det kunden ser: färdigräknade rader och summor, utan interna priser och kalkylvärden */
export type PublicView = {
  title: string
  customer: Quote['customer']
  siteAddress: string
  customerType: CustomerType
  validDays: number
  notes: string
  lines: { label: string; quantity: string; amount: number }[]
  totals: { net: number; labor: number; vatRate: number; vat: number; gross: number; rot: number; toPay: number }
}

/** Utskick och kundens svar, styrs av databasen och sparas inte med offertens innehåll */
export type QuoteTracking = {
  shareToken: string | null
  sentAt: string | null
  viewedAt: string | null
  viewCount: number
  respondedAt: string | null
  response: 'accepted' | 'declined' | null
  responseName: string | null
  responseMessage: string | null
}

export type Template = {
  id: string
  name: string
  lines: Line[]
}
