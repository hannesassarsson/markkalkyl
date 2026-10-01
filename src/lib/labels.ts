import type { Line, QuoteStatus } from './types'

export const kindLabel: Record<Line['kind'], string> = {
  schakt: 'Schakt',
  fyllnad: 'Fyllnad',
  artikel: 'Material',
  maskin: 'Maskintid',
  arbete: 'Handarbete',
  fri: 'Fri rad',
}

export const statusLabel: Record<QuoteStatus, string> = {
  utkast: 'Utkast',
  skickad: 'Skickad',
  accepterad: 'Accepterad',
  forlorad: 'Förlorad',
}
