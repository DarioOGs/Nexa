import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string
  onCerrar: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCerrar}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-text-primary">{titulo}</h2>
          <button onClick={onCerrar} className="text-text-secondary hover:text-text-primary" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
