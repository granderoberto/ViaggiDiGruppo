export function Spinner({ label = 'Caricamento in corso' }: { label?: string }) {
  return (
    <div className="row" role="status" aria-live="polite" aria-label={label}>
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
