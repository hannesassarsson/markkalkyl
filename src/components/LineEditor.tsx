import { calcLine } from '../lib/calc'
import { kr } from '../lib/format'
import { kindLabel } from '../lib/labels'
import type { Line, PriceList } from '../lib/types'
import { Button, Field, NumberInput, Select, TextInput, inputCls } from './ui'

type Props = {
  line: Line
  prices: PriceList
  onChange: (line: Line) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  isFirst: boolean
  isLast: boolean
}

export function LineEditor({ line, prices, onChange, onRemove, onMove, isFirst, isLast }: Props) {
  const result = calcLine(line, prices)
  const set = (patch: Record<string, unknown>) => onChange({ ...line, ...patch } as Line)

  const machineOpts = prices.machines.map((m) => ({ value: m.id, label: m.name }))
  const tonOpts = prices.materials.filter((m) => m.unit === 'ton').map((m) => ({ value: m.id, label: m.name }))
  const articleOpts = prices.materials.filter((m) => m.unit !== 'ton').map((m) => ({ value: m.id, label: `${m.name} (${m.unit})` }))

  return (
    <article className="grid gap-3 rounded-lg border border-line bg-white p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-ink/[.06] px-2 py-0.5 font-mono text-[11px] tracking-wider text-muted uppercase">
          {kindLabel[line.kind]}
        </span>
        <input
          aria-label="Benämning"
          className="min-w-0 flex-1 border-b border-transparent bg-transparent px-1 py-0.5 text-[15px] font-semibold outline-none focus:border-accent"
          value={line.label}
          placeholder="Benämning på offerten"
          onChange={(e) => set({ label: e.target.value })}
        />
        <div className="flex items-center">
          <Button variant="ghost" aria-label="Flytta upp" disabled={isFirst} onClick={() => onMove(-1)}>↑</Button>
          <Button variant="ghost" aria-label="Flytta ner" disabled={isLast} onClick={() => onMove(1)}>↓</Button>
          <Button variant="danger" aria-label="Ta bort rad" onClick={onRemove}>✕</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {line.kind === 'schakt' && (
          <>
            <Field label="Yta"><NumberInput unit="m²" value={line.areaM2} onChange={(v) => set({ areaM2: v })} /></Field>
            <Field label="Djup"><NumberInput unit="m" value={line.depthM} onChange={(v) => set({ depthM: v })} /></Field>
            <Field label="Maskin"><Select value={line.machineId} options={machineOpts} onChange={(v) => set({ machineId: v })} /></Field>
            <Field label="Kapacitet"><NumberInput unit="m³/h" value={line.capacityM3h} onChange={(v) => set({ capacityM3h: v })} /></Field>
            <Field label="Bortforsling">
              <select
                className={inputCls}
                value={line.disposalId ?? ''}
                onChange={(e) => set({ disposalId: e.target.value || null })}
              >
                <option value="">Massor kvar på plats</option>
                {prices.disposals.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            {line.disposalId && (
              <Field label="Tur & retur"><NumberInput unit="h/lass" value={line.roundTripH} onChange={(v) => set({ roundTripH: v })} /></Field>
            )}
            <Field label="Densitet fast"><NumberInput unit="t/m³" value={line.soilDensity} onChange={(v) => set({ soilDensity: v })} /></Field>
            <Field label="Svällning"><NumberInput unit="×" value={line.swellFactor} onChange={(v) => set({ swellFactor: v })} /></Field>
          </>
        )}

        {line.kind === 'fyllnad' && (
          <>
            <Field label="Material"><Select value={line.materialId} options={tonOpts} onChange={(v) => set({ materialId: v })} /></Field>
            <Field label="Yta"><NumberInput unit="m²" value={line.areaM2} onChange={(v) => set({ areaM2: v })} /></Field>
            <Field label="Tjocklek"><NumberInput unit="m" value={line.thicknessM} onChange={(v) => set({ thicknessM: v })} /></Field>
            <Field label="Maskin"><Select value={line.machineId} options={machineOpts} onChange={(v) => set({ machineId: v })} /></Field>
            <Field label="Kapacitet"><NumberInput unit="m³/h" value={line.capacityM3h} onChange={(v) => set({ capacityM3h: v })} /></Field>
          </>
        )}

        {line.kind === 'artikel' && (
          <>
            <div className="col-span-2"><Field label="Material"><Select value={line.materialId} options={articleOpts} onChange={(v) => set({ materialId: v })} /></Field></div>
            <Field label="Antal">
              <NumberInput unit={prices.materials.find((m) => m.id === line.materialId)?.unit} value={line.quantity} onChange={(v) => set({ quantity: v })} />
            </Field>
          </>
        )}

        {line.kind === 'maskin' && (
          <>
            <div className="col-span-2"><Field label="Maskin"><Select value={line.machineId} options={machineOpts} onChange={(v) => set({ machineId: v })} /></Field></div>
            <Field label="Tid"><NumberInput unit="h" value={line.hours} onChange={(v) => set({ hours: v })} /></Field>
          </>
        )}

        {line.kind === 'arbete' && (
          <Field label="Tid"><NumberInput unit="h" value={line.hours} onChange={(v) => set({ hours: v })} /></Field>
        )}

        {line.kind === 'fri' && (
          <>
            <Field label="Antal"><NumberInput value={line.quantity} onChange={(v) => set({ quantity: v })} /></Field>
            <Field label="Enhet"><TextInput value={line.unit} onChange={(e) => set({ unit: e.target.value })} /></Field>
            <Field label="À-pris"><NumberInput unit="kr" value={line.unitPrice} onChange={(v) => set({ unitPrice: v })} /></Field>
            <Field label="Typ" hint={line.category === 'arbete' ? 'Grundar ROT' : undefined}>
              <Select
                value={line.category}
                onChange={(v) => set({ category: v })}
                options={[
                  { value: 'arbete', label: 'Arbete' },
                  { value: 'material', label: 'Material' },
                  { value: 'ovrigt', label: 'Övrigt' },
                ]}
              />
            </Field>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-t border-dashed border-line pt-2.5">
        <p className="font-mono text-xs leading-relaxed text-muted">{result.details.join(' · ') || ' '}</p>
        <p className="font-display text-lg font-bold tabular-nums">{kr(result.total)}</p>
      </div>
    </article>
  )
}
