import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { num } from '../lib/format'
import { area, lineLength, perimeter, type LatLng } from '../lib/geo'
import { Button, TextInput } from './ui'

export type MeasureTarget = 'area' | 'perimeter' | 'length'
export type MeasureResult = { area: number; perimeter: number; length: number }

type Props = {
  target: MeasureTarget
  address: string
  onApply: (value: number, result: MeasureResult) => void
  onClose: () => void
}

const targetLabel: Record<MeasureTarget, string> = { area: 'yta', perimeter: 'omkrets', length: 'längd' }

// Flygbild från Esri (kräver attribuering). Gatukarta från OpenStreetMap som alternativ.
const imagery = () =>
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 21,
    maxNativeZoom: 19,
    attribution: 'Flygbild © Esri, Maxar, Earthstar Geographics',
  })
const streets = () =>
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 21,
    maxNativeZoom: 19,
    attribution: '© OpenStreetMap',
  })

const vertexIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#d9530b;border:2px solid #fff;box-shadow:0 0 0 1px #0006"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

async function geocode(q: string): Promise<LatLng | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=se&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'sv' } })
  if (!res.ok) return null
  const hits = (await res.json()) as { lat: string; lon: string }[]
  return hits[0] ? { lat: Number(hits[0].lat), lng: Number(hits[0].lon) } : null
}

/** Rita en yta eller sträcka på flygbild och få m² eller meter */
export default function MapMeasure({ target, address, onApply, onClose }: Props) {
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const shape = useRef<L.Polygon | L.Polyline | null>(null)
  const markers = useRef<L.Marker[]>([])
  const [points, setPoints] = useState<LatLng[]>([])
  const [query, setQuery] = useState(address)
  const [searchMsg, setSearchMsg] = useState('')
  const closed = target !== 'length'

  // Skapa kartan en gång
  useEffect(() => {
    if (!mapEl.current) return
    const m = L.map(mapEl.current, { zoomControl: true }).setView([55.6, 14.0], 8)
    const sat = imagery().addTo(m)
    L.control.layers({ Flygbild: sat, Karta: streets() }, undefined, { position: 'topright' }).addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) => setPoints((p) => [...p, { lat: e.latlng.lat, lng: e.latlng.lng }]))
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  // Sök upp arbetsplatsens adress när kartan öppnas
  useEffect(() => {
    if (!address.trim()) return
    let cancelled = false
    geocode(address).then((pos) => {
      if (!cancelled && pos) map.current?.setView([pos.lat, pos.lng], 19)
    })
    return () => {
      cancelled = true
    }
  }, [address])

  // Rita om formen och punkterna när de ändras
  useEffect(() => {
    const m = map.current
    if (!m) return
    shape.current?.remove()
    markers.current.forEach((mk) => mk.remove())
    const latlngs = points.map((p) => L.latLng(p.lat, p.lng))
    const style = { color: '#d9530b', weight: 3, fillOpacity: 0.25 }
    shape.current = (closed && points.length >= 3 ? L.polygon(latlngs, style) : L.polyline(latlngs, style)).addTo(m)
    markers.current = points.map((p, i) => {
      const mk = L.marker([p.lat, p.lng], { icon: vertexIcon, draggable: true, keyboard: false }).addTo(m)
      mk.on('dragend', () => {
        const ll = mk.getLatLng()
        setPoints((ps) => ps.map((q, j) => (j === i ? { lat: ll.lat, lng: ll.lng } : q)))
      })
      return mk
    })
  }, [points, closed])

  const result: MeasureResult = { area: area(points), perimeter: perimeter(points), length: lineLength(points) }
  const value = result[target]
  const rounded = target === 'area' ? Math.round(value) : Math.round(value * 10) / 10
  const enough = target === 'length' ? points.length >= 2 : points.length >= 3

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearchMsg('Söker…')
    const pos = await geocode(query).catch(() => null)
    if (pos) {
      map.current?.setView([pos.lat, pos.lng], 19)
      setSearchMsg('')
    } else setSearchMsg('Hittade inte adressen. Prova med ort, eller zooma fram manuellt.')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={`Mät ${targetLabel[target]} på karta`}>
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden bg-surface sm:rounded-lg">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <p className="font-display text-xl font-bold uppercase">Mät {targetLabel[target]}</p>
          <form onSubmit={search} className="flex min-w-0 flex-1 basis-64 gap-2">
            <TextInput id="map-search" value={query} placeholder="Adress eller ort" onChange={(e) => setQuery(e.target.value)} />
            <Button type="submit">Sök</Button>
          </form>
          <Button variant="ghost" onClick={onClose} aria-label="Stäng">✕</Button>
        </div>
        {searchMsg && <p className="px-3 pt-2 text-sm text-muted">{searchMsg}</p>}
        <div ref={mapEl} className="min-h-[300px] flex-1" style={{ cursor: 'crosshair' }} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line p-3">
          {closed && result.area > 50_000 && (
            <p className="w-full text-sm font-semibold text-warn">Ytan är över 5 hektar. Zooma in och kontrollera att punkterna hamnat rätt.</p>
          )}
          <p className="min-w-0 flex-1 text-sm text-muted">
            {points.length === 0
              ? `Klicka i kartan för att sätta ut ${closed ? 'hörnen på ytan' : 'sträckans punkter'}. Dra i en punkt för att flytta den.`
              : closed
                ? `${num(result.area, 0)} m² · omkrets ${num(result.perimeter)} m · ${points.length} punkter`
                : `${num(result.length)} m · ${points.length} punkter`}
          </p>
          <Button onClick={() => setPoints((p) => p.slice(0, -1))} disabled={!points.length}>Ångra punkt</Button>
          <Button onClick={() => setPoints([])} disabled={!points.length}>Rensa</Button>
          <Button variant="primary" disabled={!enough} onClick={() => onApply(rounded, result)}>
            Använd {enough ? `${num(rounded, target === 'area' ? 0 : 1)} ${target === 'area' ? 'm²' : 'm'}` : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}
