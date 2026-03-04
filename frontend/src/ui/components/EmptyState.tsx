export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="card stack" role="status" aria-live="polite">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
    </div>
  )
}
