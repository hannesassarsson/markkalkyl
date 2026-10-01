import { describe, expect, it } from 'vitest'
import { area, distance, lineLength, perimeter } from './geo'

// En kvadrat på ungefär 20 × 20 m i Gärsnäs
const lat = 55.55
const dLat = 20 / 111_195 // 20 m i latitud
const dLng = 20 / (111_195 * Math.cos((lat * Math.PI) / 180))
const square = [
  { lat, lng: 14.17 },
  { lat, lng: 14.17 + dLng },
  { lat: lat + dLat, lng: 14.17 + dLng },
  { lat: lat + dLat, lng: 14.17 },
]

describe('geo', () => {
  it('mäter avstånd', () => {
    expect(distance(square[0], square[1])).toBeCloseTo(20, 1)
  })
  it('mäter yta och omkrets på en kvadrat', () => {
    expect(area(square)).toBeCloseTo(400, 0)
    expect(perimeter(square)).toBeCloseTo(80, 0)
  })
  it('mäter en öppen linje', () => {
    expect(lineLength(square.slice(0, 3))).toBeCloseTo(40, 0)
  })
  it('ger noll yta för färre än tre punkter', () => {
    expect(area(square.slice(0, 2))).toBe(0)
  })
})
