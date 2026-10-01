import type { Line, PriceList } from './types'

export const uid = () => Math.random().toString(36).slice(2, 10)

/** Exempelpriser. Ersätt med företagets egna under Prislista. */
export const defaultPrices: PriceList = {
  machines: [
    { id: 'mini', name: 'Minigrävare 1,5–3 t', hourlyRate: 850, laborShare: 450 },
    { id: 'grav10', name: 'Grävmaskin 8–14 t', hourlyRate: 1050, laborShare: 450 },
    { id: 'hjul18', name: 'Hjulgrävare 18 t', hourlyRate: 1250, laborShare: 450 },
    { id: 'lastare', name: 'Hjullastare', hourlyRate: 950, laborShare: 450 },
    { id: 'lastbil', name: 'Lastbil 3-axlad tipp', hourlyRate: 1050, laborShare: 450 },
    { id: 'vibro', name: 'Markvibrator (utan förare)', hourlyRate: 150, laborShare: 0 },
  ],
  materials: [
    { id: 'barlager', name: 'Bärlager 0/32', unit: 'ton', price: 230, density: 2.1 },
    { id: 'forst', name: 'Förstärkningslager 0/90', unit: 'ton', price: 210, density: 2.0 },
    { id: 'makadam', name: 'Makadam 16/32', unit: 'ton', price: 290, density: 1.6 },
    { id: 'stenmjol', name: 'Stenmjöl 0/4', unit: 'ton', price: 260, density: 1.8 },
    { id: 'sand', name: 'Sättsand 0/8', unit: 'ton', price: 220, density: 1.7 },
    { id: 'matjord', name: 'Matjord', unit: 'ton', price: 300, density: 1.4 },
    { id: 'dranror', name: 'Dräneringsrör 110 mm', unit: 'm', price: 35 },
    { id: 'markduk', name: 'Markduk klass 3', unit: 'm²', price: 15 },
    { id: 'kantsten', name: 'Kantsten betong', unit: 'm', price: 95 },
    { id: 'spolbrunn', name: 'Spolbrunn 315 mm', unit: 'st', price: 1450 },
  ],
  disposals: [
    { id: 'rena', name: 'Rena schaktmassor', pricePerTon: 120 },
    { id: 'lera', name: 'Lera', pricePerTon: 180 },
    { id: 'blandat', name: 'Massor med asfalt/betong', pricePerTon: 260 },
  ],
  truckId: 'lastbil',
  truckCapacityTon: 14,
  laborRate: 550,
  materialMarkupPct: 15,
  hourRoundingStep: 0.5,
}

export const blankLine = (kind: Line['kind'], prices: PriceList): Line => {
  const id = uid()
  const firstTon = prices.materials.find((m) => m.unit === 'ton')?.id ?? ''
  const firstOther = prices.materials.find((m) => m.unit !== 'ton')?.id ?? ''
  const digger = prices.machines.find((m) => m.id === 'grav10')?.id ?? prices.machines[0]?.id ?? ''
  switch (kind) {
    case 'schakt':
      return {
        kind, id, label: 'Schakt', areaM2: 0, depthM: 0.5, soilDensity: 1.9, swellFactor: 1.25,
        machineId: digger, capacityM3h: 20, disposalId: prices.disposals[0]?.id ?? null, roundTripH: 0.75,
      }
    case 'fyllnad':
      return { kind, id, label: 'Fyllnad', areaM2: 0, thicknessM: 0.2, materialId: firstTon, machineId: digger, capacityM3h: 15 }
    case 'artikel':
      return { kind, id, label: 'Material', materialId: firstOther, quantity: 0 }
    case 'maskin':
      return { kind, id, label: 'Maskintid', machineId: digger, hours: 0 }
    case 'arbete':
      return { kind, id, label: 'Handarbete', hours: 0 }
    case 'fri':
      return { kind, id, label: '', quantity: 1, unit: 'st', unitPrice: 0, category: 'ovrigt' }
  }
}

export type Recipe = {
  id: string
  name: string
  description: string
  inputs: { key: string; label: string; unit: string; default: number }[]
  build: (v: Record<string, number>, prices: PriceList) => Line[]
}

/** Vanliga jobb som paket. Varje paket blir vanliga rader som går att justera i efterhand. */
export const recipes: Recipe[] = [
  {
    id: 'uppfart',
    name: 'Grusad uppfart / garageplan',
    description: 'Urschakt, markduk, förstärkningslager, bärlager och stenmjöl som slitlager.',
    inputs: [
      { key: 'area', label: 'Yta', unit: 'm²', default: 60 },
      { key: 'depth', label: 'Urschaktsdjup', unit: 'm', default: 0.5 },
    ],
    build: ({ area, depth }, p) => {
      const forst = Math.round(Math.max(0, depth - 0.15) * 100) / 100
      return [
        { ...(blankLine('schakt', p) as Extract<Line, { kind: 'schakt' }>), label: 'Urschakt för uppfart', areaM2: area, depthM: depth },
        { ...(blankLine('artikel', p) as Extract<Line, { kind: 'artikel' }>), label: 'Markduk', materialId: 'markduk', quantity: Math.ceil(area * 1.1) },
        { ...(blankLine('fyllnad', p) as Extract<Line, { kind: 'fyllnad' }>), label: 'Förstärkningslager', materialId: 'forst', areaM2: area, thicknessM: forst },
        { ...(blankLine('fyllnad', p) as Extract<Line, { kind: 'fyllnad' }>), label: 'Bärlager', materialId: 'barlager', areaM2: area, thicknessM: 0.1 },
        { ...(blankLine('fyllnad', p) as Extract<Line, { kind: 'fyllnad' }>), label: 'Slitlager stenmjöl', materialId: 'stenmjol', areaM2: area, thicknessM: 0.05 },
        { ...(blankLine('maskin', p) as Extract<Line, { kind: 'maskin' }>), label: 'Vältning med markvibrator', machineId: 'vibro', hours: Math.max(1, Math.ceil(area / 20) / 2) },
      ]
    },
  },
  {
    id: 'dranering',
    name: 'Dränering runt hus',
    description: 'Schakt längs grunden, dräneringsrör, spolbrunnar, makadam runt röret och återfyllnad.',
    inputs: [
      { key: 'perimeter', label: 'Husets omkrets', unit: 'm', default: 44 },
      { key: 'depth', label: 'Schaktdjup', unit: 'm', default: 1.2 },
      { key: 'width', label: 'Schaktbredd', unit: 'm', default: 0.8 },
      { key: 'wells', label: 'Spolbrunnar', unit: 'st', default: 4 },
    ],
    build: ({ perimeter, depth, width, wells }, p) => {
      const area = Math.round(perimeter * width * 10) / 10
      const backfillHours = Math.ceil(((area * depth) / 12) * 0.6 * 2) / 2
      return [
        {
          ...(blankLine('schakt', p) as Extract<Line, { kind: 'schakt' }>),
          label: 'Schakt längs grund', areaM2: area, depthM: depth, capacityM3h: 12, machineId: 'grav10', disposalId: null,
        },
        { ...(blankLine('artikel', p) as Extract<Line, { kind: 'artikel' }>), label: 'Dräneringsrör', materialId: 'dranror', quantity: Math.ceil(perimeter * 1.05) },
        { ...(blankLine('artikel', p) as Extract<Line, { kind: 'artikel' }>), label: 'Spolbrunnar', materialId: 'spolbrunn', quantity: wells },
        { ...(blankLine('artikel', p) as Extract<Line, { kind: 'artikel' }>), label: 'Markduk', materialId: 'markduk', quantity: Math.ceil(perimeter * 2) },
        {
          ...(blankLine('fyllnad', p) as Extract<Line, { kind: 'fyllnad' }>),
          label: 'Makadam runt dräneringsrör', materialId: 'makadam', areaM2: area, thicknessM: 0.3, machineId: 'grav10',
        },
        { ...(blankLine('maskin', p) as Extract<Line, { kind: 'maskin' }>), label: 'Återfyllnad', machineId: 'grav10', hours: backfillHours },
        { ...(blankLine('arbete', p) as Extract<Line, { kind: 'arbete' }>), label: 'Rörläggning och brunnar', hours: Math.ceil(perimeter / 8) },
      ]
    },
  },
]
