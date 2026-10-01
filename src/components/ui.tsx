import { useId, useState, type ReactNode } from 'react'

const parse = (s: string) => {
  const n = Number(s.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export const inputCls =
  'w-full min-w-0 rounded-md border border-line bg-white px-2.5 py-1.5 text-[15px] text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="grid min-w-0 gap-1">
      <span className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}

/** Sifferfält som tar både komma och punkt som decimaltecken */
export function NumberInput({
  value, onChange, unit, step, className = '', id,
}: { value: number; onChange: (n: number) => void; unit?: string; step?: number; className?: string; id?: string }) {
  const show = (n: number) => (n ? String(n).replace('.', ',') : '')
  const [text, setText] = useState(() => show(value))
  const [prev, setPrev] = useState(value)
  // Synka bara när värdet ändras utifrån, inte medan någon skriver "0,"
  if (value !== prev) {
    setPrev(value)
    if (parse(text) !== value) setText(show(value))
  }
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        inputMode="decimal"
        className={`${inputCls} tabular-nums ${unit ? 'pr-10' : ''}`}
        value={text}
        placeholder="0"
        step={step}
        onChange={(e) => {
          setText(e.target.value)
          onChange(parse(e.target.value))
        }}
      />
      {unit && <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted">{unit}</span>}
    </div>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function Select<T extends string>({
  value, onChange, options, className = '',
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  const known = options.some((o) => o.value === value)
  return (
    <select className={`${inputCls} ${className} ${known ? '' : 'border-warn text-warn'}`} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {!known && <option value={value}>Saknas i prislistan</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Button({
  children, variant = 'secondary', className = '', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent-dark',
    secondary: 'bg-white text-ink border border-line hover:border-ink/40',
    ghost: 'text-muted hover:text-ink hover:bg-ink/5',
    danger: 'text-warn hover:bg-warn/10',
  }[variant]
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={title ? id : undefined} className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 id={id} className="font-display text-xl font-bold tracking-wide uppercase">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
