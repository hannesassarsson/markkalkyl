const nfKr = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 })
export const kr = (n: number) => `${nfKr.format(Math.round(n))} kr`
export const num = (n: number, digits = 1) =>
  new Intl.NumberFormat('sv-SE', { maximumFractionDigits: digits }).format(n)
