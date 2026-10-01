import type {
  Breakdown,
  CustomerType,
  Line,
  LineResult,
  Machine,
  Material,
  PriceList,
  Quote,
  QuoteTotals,
} from './types'

export const VAT_RATE = 0.25
/** ROT 2026: 30 % av arbetskostnaden inkl. moms, max 50 000 kr per person och år */
export const ROT_RATE = 0.3
export const ROT_MAX_PER_PERSON = 50_000

const emptyBreakdown = (): Breakdown => ({ labor: 0, machine: 0, material: 0, disposal: 0, other: 0 })

export const roundUp = (value: number, step: number) =>
  step > 0 ? Math.ceil(value / step - 1e-9) * step : value

const nf1 = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const f1 = (n: number) => nf1.format(n)

export function findMachine(prices: PriceList, id: string): Machine | undefined {
  return prices.machines.find((m) => m.id === id)
}

export function findMaterial(prices: PriceList, id: string): Material | undefined {
  return prices.materials.find((m) => m.id === id)
}

/** Maskintid fördelad på arbete (förare) och maskin */
function machineCost(machine: Machine | undefined, hours: number) {
  if (!machine || hours <= 0) return { labor: 0, machine: 0 }
  const labor = Math.min(machine.laborShare, machine.hourlyRate) * hours
  return { labor, machine: machine.hourlyRate * hours - labor }
}

export function calcLine(line: Line, prices: PriceList): LineResult {
  const b = emptyBreakdown()
  const details: string[] = []
  const markup = 1 + prices.materialMarkupPct / 100

  switch (line.kind) {
    case 'schakt': {
      const solid = Math.max(0, line.areaM2 * line.depthM)
      const loose = solid * line.swellFactor
      const tons = solid * line.soilDensity
      const digHours = roundUp(line.capacityM3h > 0 ? solid / line.capacityM3h : 0, prices.hourRoundingStep)
      const dig = machineCost(findMachine(prices, line.machineId), digHours)
      b.labor += dig.labor
      b.machine += dig.machine
      details.push(`${f1(solid)} m³ fast → ${f1(loose)} m³ löst → ${f1(tons)} t`)
      details.push(`Schakt ${f1(digHours)} h`)

      const disposal = line.disposalId ? prices.disposals.find((d) => d.id === line.disposalId) : undefined
      if (disposal && tons > 0) {
        const loads = prices.truckCapacityTon > 0 ? Math.ceil(tons / prices.truckCapacityTon - 1e-9) : 0
        const truckHours = roundUp(loads * line.roundTripH, prices.hourRoundingStep)
        const truck = machineCost(findMachine(prices, prices.truckId), truckHours)
        b.labor += truck.labor
        b.machine += truck.machine
        b.disposal += tons * disposal.pricePerTon
        details.push(`${loads} lass à ${f1(prices.truckCapacityTon)} t, ${f1(truckHours)} h lastbil`)
        details.push(`Tipp: ${disposal.name}`)
      } else {
        details.push('Massorna ligger kvar på platsen')
      }
      break
    }
    case 'fyllnad': {
      const material = findMaterial(prices, line.materialId)
      const volume = Math.max(0, line.areaM2 * line.thicknessM)
      const density = material?.density ?? 0
      const tons = volume * density
      const unitPrice = (material?.price ?? 0) + (material?.freightPerTon ?? 0)
      b.material += tons * unitPrice * markup
      const hours = roundUp(line.capacityM3h > 0 ? volume / line.capacityM3h : 0, prices.hourRoundingStep)
      const m = machineCost(findMachine(prices, line.machineId), hours)
      b.labor += m.labor
      b.machine += m.machine
      details.push(`${f1(volume)} m³ packat × ${f1(density)} t/m³ = ${f1(tons)} t`)
      details.push(`Utläggning och packning ${f1(hours)} h`)
      break
    }
    case 'artikel': {
      const material = findMaterial(prices, line.materialId)
      b.material += Math.max(0, line.quantity) * (material?.price ?? 0) * markup
      if (material) details.push(`${f1(line.quantity)} ${material.unit} ${material.name}`)
      break
    }
    case 'maskin': {
      const hours = roundUp(Math.max(0, line.hours), prices.hourRoundingStep)
      const m = machineCost(findMachine(prices, line.machineId), hours)
      b.labor += m.labor
      b.machine += m.machine
      details.push(`${f1(hours)} h`)
      break
    }
    case 'arbete': {
      const hours = Math.max(0, line.hours)
      b.labor += hours * prices.laborRate
      details.push(`${f1(hours)} h handarbete`)
      break
    }
    case 'fri': {
      const amount = line.quantity * line.unitPrice
      if (line.category === 'arbete') b.labor += amount
      else if (line.category === 'material') b.material += amount
      else b.other += amount
      break
    }
  }

  const total = b.labor + b.machine + b.material + b.disposal + b.other
  return { total, breakdown: b, rotBase: b.labor, details }
}

export function vatRateFor(type: CustomerType) {
  return type === 'foretag_omvand' ? 0 : VAT_RATE
}

export function calcQuote(quote: Pick<Quote, 'lines' | 'prices' | 'customerType' | 'rotPersons'>): QuoteTotals {
  const breakdown = emptyBreakdown()
  let rotBase = 0
  for (const line of quote.lines) {
    const r = calcLine(line, quote.prices)
    for (const k of Object.keys(breakdown) as (keyof Breakdown)[]) breakdown[k] += r.breakdown[k]
    rotBase += r.rotBase
  }
  const net = Math.round(breakdown.labor + breakdown.machine + breakdown.material + breakdown.disposal + breakdown.other)
  const vatRate = vatRateFor(quote.customerType)
  const vat = Math.round(net * vatRate)
  const gross = net + vat

  let rot = 0
  let rotCapped = false
  const rotBaseInclVat = Math.round(rotBase * (1 + vatRate))
  if (quote.customerType === 'privat') {
    const uncapped = Math.round(rotBaseInclVat * ROT_RATE)
    const cap = ROT_MAX_PER_PERSON * Math.max(1, quote.rotPersons)
    rot = Math.min(uncapped, cap)
    rotCapped = uncapped > cap
  }

  return { breakdown, net, vatRate, vat, gross, rotBaseInclVat, rot, rotCapped, toPay: gross - rot }
}
