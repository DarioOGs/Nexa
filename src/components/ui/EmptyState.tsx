export function EmptyState({ titulo, descripcion }: { titulo: string; descripcion?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border py-14 text-center">
      <p className="font-display text-lg text-text-primary">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-sm text-sm text-text-secondary">{descripcion}</p>}
    </div>
  )
}
