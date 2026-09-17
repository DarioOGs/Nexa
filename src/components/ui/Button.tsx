import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primary' | 'secondary' | 'danger' | 'ghost'

const estilos: Record<Variante, string> = {
  primary: 'bg-accent text-white hover:bg-accent-dark disabled:opacity-60',
  secondary: 'bg-bg border border-border text-text-primary hover:border-accent',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-60',
  ghost: 'text-text-secondary hover:text-text-primary',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

export function Button({ variante = 'primary', className = '', ...props }: Props) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${estilos[variante]} ${className}`}
      {...props}
    />
  )
}
