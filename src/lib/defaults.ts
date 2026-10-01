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
    { id: 'pvc110', name: 'Avloppsrör PVC 110 mm', unit: 'm', price: 75 },
    { id: 'pe40', name: 'Vattenledning PE 40 mm', unit: 'm', price: 45 },
    { id: 'slamavsk', name: 'Slamavskiljare 2 m³', unit: 'st', price: 14500 },
    { id: 'fordbrunn', name: 'Fördelningsbrunn', unit: 'st', price: 2400 },
    { id: 'spridror', name: 'Spridningsrör 110 mm', unit: 'm', price: 60 },
    { id: 'marksten', name: 'Betongmarksten', unit: 'm²', price: 220 },
    { id: 'murblock', name: 'Murblock betong (vyta)', unit: 'm²', price: 950 },
    { id: 'rullgras', name: 'Rullgräs', unit: 'm²', price: 75 },
  ],
  disposals: [
    { id: 'rena', name: 'Rena schaktmassor', pricePerTon: 120 },
    { id: 'lera', name: 'Lera', pricePerTon: 180 },
    { id: 'blandat', name: 'Massor med asfalt/betong', pricePerTon: 260 },
    { id: 'deponi', name: 'Deponi inkl. avfallsskatt (750 kr/t)', pricePerTon: 1000 },
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

/** Vad ett paketfält kan mätas som på kartan */
export type MeasureKind = 'area' | 'perimeter' | 'length'

export type Recipe = {
  id: string
  name: string
  description: string
  inputs: { key: string; label: string; unit: string; default: number; measure?: MeasureKind }[]
  build: (v: Record<string, number>, prices: PriceList) => Line[]
}

const r1 = (n: number) => Math.round(n * 10) / 10
const halfHours = (n: number) => Math.max(0.5, Math.ceil(n * 2) / 2)

type K<T extends Line['kind']> = Extract<Line, { kind: T }>
const schakt = (p: PriceList, v: Partial<K<'schakt'>>): Line => ({ ...(blankLine('schakt', p) as K<'schakt'>), ...v })
const fyll = (p: PriceList, v: Partial<K<'fyllnad'>>): Line => ({ ...(blankLine('fyllnad', p) as K<'fyllnad'>), ...v })
const artikel = (p: PriceList, label: string, materialId: string, quantity: number): Line => ({
  ...(blankLine('artikel', p) as K<'artikel'>), label, materialId, quantity,
})
const maskin = (p: PriceList, label: string, machineId: string, hours: number): Line => ({
  ...(blankLine('maskin', p) as K<'maskin'>), label, machineId, hours,
})
const arbete = (p: PriceList, label: string, hours: number): Line => ({ ...(blankLine('arbete', p) as K<'arbete'>), label, hours })

/** Vanliga jobb som paket. Varje paket blir vanliga rader som går att justera i efterhand. */
export const recipes: Recipe[] = [
  {
    id: 'uppfart',
    name: 'Grusad uppfart / garageplan',
    description: 'Urschakt, markduk, förstärkningslager, bärlager och stenmjöl som slitlager.',
    inputs: [
      { key: 'area', label: 'Yta', unit: 'm²', default: 60, measure: 'area' },
      { key: 'depth', label: 'Urschaktsdjup', unit: 'm', default: 0.5 },
    ],
    build: ({ area, depth }, p) => [
      schakt(p, { label: 'Urschakt för uppfart', areaM2: area, depthM: depth }),
      artikel(p, 'Markduk', 'markduk', Math.ceil(area * 1.1)),
      fyll(p, { label: 'Förstärkningslager', materialId: 'forst', areaM2: area, thicknessM: Math.round(Math.max(0, depth - 0.15) * 100) / 100 }),
      fyll(p, { label: 'Bärlager', materialId: 'barlager', areaM2: area, thicknessM: 0.1 }),
      fyll(p, { label: 'Slitlager stenmjöl', materialId: 'stenmjol', areaM2: area, thicknessM: 0.05 }),
      maskin(p, 'Vältning med markvibrator', 'vibro', Math.max(1, halfHours(area / 40))),
    ],
  },
  {
    id: 'dranering',
    name: 'Dränering runt hus',
    description: 'Schakt längs grunden, dräneringsrör, spolbrunnar, makadam runt röret och återfyllnad.',
    inputs: [
      { key: 'perimeter', label: 'Husets omkrets', unit: 'm', default: 44, measure: 'perimeter' },
      { key: 'depth', label: 'Schaktdjup', unit: 'm', default: 1.2 },
      { key: 'width', label: 'Schaktbredd', unit: 'm', default: 0.8 },
      { key: 'wells', label: 'Spolbrunnar', unit: 'st', default: 4 },
    ],
    build: ({ perimeter, depth, width, wells }, p) => {
      const area = r1(perimeter * width)
      return [
        schakt(p, { label: 'Schakt längs grund', areaM2: area, depthM: depth, capacityM3h: 12, disposalId: null }),
        artikel(p, 'Dräneringsrör', 'dranror', Math.ceil(perimeter * 1.05)),
        artikel(p, 'Spolbrunnar', 'spolbrunn', wells),
        artikel(p, 'Markduk', 'markduk', Math.ceil(perimeter * 2)),
        fyll(p, { label: 'Makadam runt dräneringsrör', materialId: 'makadam', areaM2: area, thicknessM: 0.3 }),
        maskin(p, 'Återfyllnad', 'grav10', halfHours(((area * depth) / 12) * 0.6)),
        arbete(p, 'Rörläggning och brunnar', Math.ceil(perimeter / 8)),
      ]
    },
  },
  {
    id: 'avlopp',
    name: 'Enskilt avlopp (markbädd)',
    description: 'Slamavskiljare, fördelningsbrunn, ledningar och markbädd med spridningsrör. Kräver tillstånd från kommunen.',
    inputs: [
      { key: 'bed', label: 'Bäddens yta', unit: 'm²', default: 30, measure: 'area' },
      { key: 'bedDepth', label: 'Schaktdjup bädd', unit: 'm', default: 1.0 },
      { key: 'pipe', label: 'Ledning från hus', unit: 'm', default: 15, measure: 'length' },
    ],
    build: ({ bed, bedDepth, pipe }, p) => [
      schakt(p, { label: 'Schakt för markbädd', areaM2: bed, depthM: bedDepth, disposalId: 'rena' }),
      schakt(p, { label: 'Schakt för ledning och slamavskiljare', areaM2: r1(pipe * 0.8 + 6), depthM: 1.2, disposalId: null }),
      artikel(p, 'Slamavskiljare', 'slamavsk', 1),
      artikel(p, 'Fördelningsbrunn', 'fordbrunn', 1),
      artikel(p, 'Avloppsrör', 'pvc110', Math.ceil(pipe * 1.05)),
      artikel(p, 'Spridningsrör', 'spridror', Math.ceil(bed / 2)),
      artikel(p, 'Markduk', 'markduk', Math.ceil(bed * 1.2)),
      fyll(p, { label: 'Makadam i bädd', materialId: 'makadam', areaM2: bed, thicknessM: 0.5 }),
      maskin(p, 'Återfyllnad och planering', 'grav10', halfHours(bed / 10 + pipe / 15)),
      arbete(p, 'Rörläggning och montage', 8),
    ],
  },
  {
    id: 'va',
    name: 'VA-anslutning',
    description: 'Schakt för vatten och avlopp från förbindelsepunkt till hus, ledningsbädd och återfyllnad.',
    inputs: [
      { key: 'length', label: 'Ledningslängd', unit: 'm', default: 25, measure: 'length' },
      { key: 'depth', label: 'Schaktdjup', unit: 'm', default: 1.6 },
    ],
    build: ({ length, depth }, p) => {
      const area = r1(length * 0.8)
      return [
        schakt(p, { label: 'Ledningsschakt', areaM2: area, depthM: depth, capacityM3h: 15, disposalId: null }),
        artikel(p, 'Avloppsrör', 'pvc110', Math.ceil(length * 1.05)),
        artikel(p, 'Vattenledning', 'pe40', Math.ceil(length * 1.05)),
        fyll(p, { label: 'Ledningsbädd och kringfyllnad', materialId: 'sand', areaM2: area, thicknessM: 0.3 }),
        maskin(p, 'Återfyllnad', 'grav10', halfHours((area * depth) / 20)),
        arbete(p, 'Rörläggning och anslutning', Math.max(4, Math.ceil(length / 5))),
      ]
    },
  },
  {
    id: 'platta',
    name: 'Markarbete för platta på mark',
    description: 'Urschakt, markduk, förstärkningslager och dränerande makadamlager under husgrund.',
    inputs: [
      { key: 'area', label: 'Plattans yta', unit: 'm²', default: 120, measure: 'area' },
      { key: 'depth', label: 'Urschaktsdjup', unit: 'm', default: 0.4 },
    ],
    build: ({ area, depth }, p) => {
      const ground = r1(area * 1.15) // plattan plus utkant
      return [
        schakt(p, { label: 'Urschakt för grund', areaM2: ground, depthM: depth, disposalId: 'rena' }),
        artikel(p, 'Markduk', 'markduk', Math.ceil(ground * 1.1)),
        fyll(p, { label: 'Förstärkningslager', materialId: 'forst', areaM2: ground, thicknessM: 0.25 }),
        fyll(p, { label: 'Dränerande makadam', materialId: 'makadam', areaM2: ground, thicknessM: 0.15 }),
        maskin(p, 'Packning med markvibrator', 'vibro', Math.max(1, halfHours(ground / 30))),
      ]
    },
  },
  {
    id: 'uteplats',
    name: 'Plattsättning / uteplats',
    description: 'Urschakt, förstärknings- och bärlager, sättsand, marksten och kantsten.',
    inputs: [
      { key: 'area', label: 'Yta', unit: 'm²', default: 25, measure: 'area' },
      { key: 'edge', label: 'Kantsten', unit: 'm', default: 20, measure: 'perimeter' },
    ],
    build: ({ area, edge }, p) => [
      schakt(p, { label: 'Urschakt', areaM2: area, depthM: 0.35, disposalId: 'rena' }),
      artikel(p, 'Markduk', 'markduk', Math.ceil(area * 1.1)),
      fyll(p, { label: 'Förstärkningslager', materialId: 'forst', areaM2: area, thicknessM: 0.2 }),
      fyll(p, { label: 'Bärlager', materialId: 'barlager', areaM2: area, thicknessM: 0.08 }),
      fyll(p, { label: 'Sättsand', materialId: 'sand', areaM2: area, thicknessM: 0.03 }),
      artikel(p, 'Marksten', 'marksten', Math.ceil(area * 1.05)),
      artikel(p, 'Kantsten', 'kantsten', Math.ceil(edge)),
      arbete(p, 'Plattläggning och kantsten', Math.ceil(area / 6 + edge / 10)),
      maskin(p, 'Packning med markvibrator', 'vibro', Math.max(1, halfHours(area / 20))),
    ],
  },
  {
    id: 'stodmur',
    name: 'Stödmur av murblock',
    description: 'Schakt för fundament, murblock, dränerande bakfyllning och markduk.',
    inputs: [
      { key: 'length', label: 'Murens längd', unit: 'm', default: 12, measure: 'length' },
      { key: 'height', label: 'Höjd', unit: 'm', default: 0.8 },
    ],
    build: ({ length, height }, p) => [
      schakt(p, { label: 'Schakt för fundament', areaM2: r1(length * 1.0), depthM: 0.4, disposalId: null }),
      fyll(p, { label: 'Bärlager under mur', materialId: 'barlager', areaM2: r1(length * 0.8), thicknessM: 0.2 }),
      artikel(p, 'Murblock', 'murblock', Math.ceil(length * height)),
      fyll(p, { label: 'Dränerande bakfyllning', materialId: 'makadam', areaM2: r1(length * 0.4), thicknessM: height }),
      artikel(p, 'Markduk', 'markduk', Math.ceil(length * (height + 1))),
      maskin(p, 'Lyft och sättning av block', 'grav10', halfHours(length / 6)),
      arbete(p, 'Murning och justering', Math.ceil(length * height * 1.5)),
    ],
  },
  {
    id: 'pool',
    name: 'Poolschakt',
    description: 'Schakt med arbetsutrymme runt poolen, bortforsling och makadam i botten.',
    inputs: [
      { key: 'l', label: 'Poolens längd', unit: 'm', default: 8 },
      { key: 'b', label: 'Poolens bredd', unit: 'm', default: 4 },
      { key: 'depth', label: 'Schaktdjup', unit: 'm', default: 1.5 },
    ],
    build: ({ l, b, depth }, p) => [
      schakt(p, { label: 'Poolschakt inkl. arbetsutrymme', areaM2: r1((l + 1) * (b + 1)), depthM: depth, disposalId: 'rena' }),
      fyll(p, { label: 'Makadam i botten', materialId: 'makadam', areaM2: r1(l * b), thicknessM: 0.2 }),
      maskin(p, 'Återfyllnad runt pool', 'grav10', halfHours(((l + b) * 2 * 0.5 * depth) / 10)),
    ],
  },
  {
    id: 'grasmatta',
    name: 'Ny gräsmatta',
    description: 'Matjord, avjämning och rullgräs.',
    inputs: [{ key: 'area', label: 'Yta', unit: 'm²', default: 100, measure: 'area' }],
    build: ({ area }, p) => [
      fyll(p, { label: 'Matjord', materialId: 'matjord', areaM2: area, thicknessM: 0.15, machineId: 'mini' }),
      artikel(p, 'Rullgräs', 'rullgras', Math.ceil(area * 1.05)),
      arbete(p, 'Avjämning och läggning av gräs', Math.ceil(area / 40)),
    ],
  },
]

/**
 * Lägger till maskiner, material och tippar som raderna använder men som saknas i prislistan,
 * med standardpriser. Behövs när ett paket används med en prislista där något tagits bort.
 */
export function withMissingRefs(prices: PriceList, lines: Line[]): PriceList {
  const next = structuredClone(prices)
  const add = <T extends { id: string }>(list: T[], defaults: T[], id: string | null | undefined) => {
    if (!id || list.some((x) => x.id === id)) return
    const d = defaults.find((x) => x.id === id)
    if (d) list.push(structuredClone(d))
  }
  for (const l of lines) {
    if ('machineId' in l) add(next.machines, defaultPrices.machines, l.machineId)
    if ('materialId' in l) add(next.materials, defaultPrices.materials, l.materialId)
    if (l.kind === 'schakt') add(next.disposals, defaultPrices.disposals, l.disposalId)
  }
  return next
}
