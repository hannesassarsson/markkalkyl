import { calcLine, calcQuote, findMaterial } from './calc'
import { num } from './format'
import type { Line, PublicView, Quote } from './types'

/** Kort mängdangivelse som kunden förstår, utan interna kalkylvärden */
export function quantityText(line: Line, quote: Pick<Quote, 'prices'>): string {
  switch (line.kind) {
    case 'schakt':
      return `${num(line.areaM2 * line.depthM)} m³`
    case 'fyllnad':
      return `${num(line.areaM2)} m², ${num(line.thicknessM * 100, 0)} cm`
    case 'artikel':
      return `${num(line.quantity)} ${findMaterial(quote.prices, line.materialId)?.unit ?? ''}`.trim()
    case 'maskin':
    case 'arbete':
      return `${num(line.hours)} h`
    case 'fri':
      return `${num(line.quantity)} ${line.unit}`.trim()
  }
}

export function buildPublicView(quote: Quote): PublicView {
  const t = calcQuote(quote)
  return {
    title: quote.title,
    customer: quote.customer,
    siteAddress: quote.siteAddress,
    customerType: quote.customerType,
    validDays: quote.validDays,
    notes: quote.notes,
    lines: quote.lines.map((l) => ({
      label: l.label,
      quantity: quantityText(l, quote),
      amount: Math.round(calcLine(l, quote.prices).total),
    })),
    totals: { net: t.net, labor: Math.round(t.breakdown.labor), vatRate: t.vatRate, vat: t.vat, gross: t.gross, rot: t.rot, toPay: t.toPay },
  }
}
