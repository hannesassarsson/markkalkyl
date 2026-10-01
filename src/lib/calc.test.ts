import { describe, expect, it } from 'vitest'
import { calcLine, calcQuote, roundUp } from './calc'
import { blankLine, defaultPrices, recipes } from './defaults'
import type { Line } from './types'

const p = defaultPrices

describe('roundUp', () => {
  it('avrundar uppåt till steg', () => {
    expect(roundUp(1.2, 0.5)).toBe(1.5)
    expect(roundUp(1.5, 0.5)).toBe(1.5)
    expect(roundUp(1.2, 0)).toBe(1.2)
  })
})

describe('schakt', () => {
  const line: Line = {
    kind: 'schakt', id: 'a', label: 'Schakt', areaM2: 20, depthM: 0.5, soilDensity: 1.9, swellFactor: 1.25,
    machineId: 'grav10', capacityM3h: 20, disposalId: 'rena', roundTripH: 0.75,
  }

  it('räknar volym, ton, lass, tipp och maskintid', () => {
    // 10 m³ fast → 19 t → 2 lass à 14 t → 1,5 h lastbil, 0,5 h grävning
    const r = calcLine(line, p)
    expect(r.breakdown.disposal).toBe(19 * 120)
    // grävare 0,5 h + lastbil 1,5 h; förardelen 450 kr/h är arbete
    expect(r.breakdown.labor).toBeCloseTo(0.5 * 450 + 1.5 * 450)
    expect(r.breakdown.machine).toBeCloseTo(0.5 * 600 + 1.5 * 600)
    expect(r.details[0]).toContain('10,0 m³ fast')
    expect(r.details[0]).toContain('12,5 m³ löst')
    expect(r.details.join(' ')).toContain('2 lass')
  })

  it('utan bortforsling blir det ingen tipp eller lastbil', () => {
    const r = calcLine({ ...line, disposalId: null }, p)
    expect(r.breakdown.disposal).toBe(0)
    expect(r.total).toBeCloseTo(0.5 * 1050)
  })
})

describe('fyllnad', () => {
  it('räknar ton från packad volym och lägger på materialpåslag', () => {
    const line: Line = {
      kind: 'fyllnad', id: 'b', label: 'Bärlager', areaM2: 50, thicknessM: 0.1, materialId: 'barlager', machineId: 'grav10', capacityM3h: 15,
    }
    const r = calcLine(line, p)
    // 5 m³ × 2,1 = 10,5 t × 230 kr × 1,15
    expect(r.breakdown.material).toBeCloseTo(10.5 * 230 * 1.15)
    expect(r.breakdown.labor).toBeCloseTo(0.5 * 450)
  })
})

describe('offert', () => {
  const lines: Line[] = [
    { kind: 'arbete', id: '1', label: 'Arbete', hours: 10 }, // 5 500 kr arbete
    { kind: 'fri', id: '2', label: 'Rör', quantity: 1, unit: 'st', unitPrice: 4500, category: 'material' },
  ]

  it('privatkund: moms 25 % och ROT 30 % på arbete inkl. moms', () => {
    const t = calcQuote({ lines, prices: p, customerType: 'privat', rotPersons: 1 })
    expect(t.net).toBe(10_000)
    expect(t.vat).toBe(2_500)
    expect(t.rotBaseInclVat).toBe(6_875)
    expect(t.rot).toBe(2_063)
    expect(t.toPay).toBe(12_500 - 2_063)
  })

  it('ROT begränsas till 50 000 kr per person', () => {
    const big: Line[] = [{ kind: 'arbete', id: '1', label: 'Arbete', hours: 400 }]
    const one = calcQuote({ lines: big, prices: p, customerType: 'privat', rotPersons: 1 })
    expect(one.rot).toBe(50_000)
    expect(one.rotCapped).toBe(true)
    const two = calcQuote({ lines: big, prices: p, customerType: 'privat', rotPersons: 2 })
    expect(two.rot).toBe(Math.round(400 * 550 * 1.25 * 0.3))
  })

  it('omvänd byggmoms: ingen moms och inget ROT', () => {
    const t = calcQuote({ lines, prices: p, customerType: 'foretag_omvand', rotPersons: 1 })
    expect(t.vat).toBe(0)
    expect(t.rot).toBe(0)
    expect(t.toPay).toBe(10_000)
  })
})

describe('paket', () => {
  it('alla paket ger rader med pris över noll', () => {
    for (const r of recipes) {
      const values = Object.fromEntries(r.inputs.map((i) => [i.key, i.default]))
      const lines = r.build(values, p)
      expect(lines.length).toBeGreaterThan(0)
      for (const l of lines) expect(calcLine(l, p).total, `${r.name}: ${l.label}`).toBeGreaterThan(0)
    }
  })

  it('tomma rader kan räknas utan fel', () => {
    for (const kind of ['schakt', 'fyllnad', 'artikel', 'maskin', 'arbete', 'fri'] as const) {
      expect(calcLine(blankLine(kind, p), p).total).toBe(0)
    }
  })
})
