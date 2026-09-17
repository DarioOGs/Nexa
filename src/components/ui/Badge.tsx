import type { ReactNode } from 'react'

type Variante = 'accent' | 'alerta' | 'neutral' | 'exito'

const estilos: Record<Variante, string> = {
  accent: 'bg-accent/10 text-accent',
  alerta: 'bg-alert-bg text-alert-text',
  neutral: 'bg-border/60 text-text-secondary',
  exito: 'bg-emerald-100 text-emerald-800',
}

export function Badge({ children, variante = 'neutral' }: { children: ReactNode; variante?: Variante }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${estilos[variante]}`}>
      {children}
    </span>
  )
}
