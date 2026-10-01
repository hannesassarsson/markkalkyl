/** Punkt i grader */
export type LatLng = { lat: number; lng: number }

const R = 6_371_008.8 // jordens medelradie, m
const rad = (d: number) => (d * Math.PI) / 180

/** Avstånd mellan två punkter längs jordytan (haversine), m */
export function distance(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Längd på en öppen linje, m */
export function lineLength(points: LatLng[]): number {
  let sum = 0
  for (let i = 1; i < points.length; i++) sum += distance(points[i - 1], points[i])
  return sum
}

/** Omkrets på en sluten yta, m */
export function perimeter(points: LatLng[]): number {
  if (points.length < 3) return lineLength(points)
  return lineLength(points) + distance(points[points.length - 1], points[0])
}

/**
 * Yta på en polygon, m². Punkterna projiceras till ett lokalt plan runt mittpunkten,
 * vilket är mycket noggrant för tomter och byggytor (fel långt under en promille).
 */
export function area(points: LatLng[]): number {
  if (points.length < 3) return 0
  const lat0 = rad(points.reduce((s, p) => s + p.lat, 0) / points.length)
  const xy = points.map((p) => ({ x: R * rad(p.lng) * Math.cos(lat0), y: R * rad(p.lat) }))
  let sum = 0
  for (let i = 0; i < xy.length; i++) {
    const a = xy[i]
    const b = xy[(i + 1) % xy.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}
