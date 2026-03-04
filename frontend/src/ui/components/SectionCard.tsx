import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  actions?: ReactNode
  children: ReactNode
}

export function SectionCard({ title, actions, children }: SectionCardProps) {
  return (
    <section className="card section-card">
      <div className="section-card-header">
        <h2 className="section-card-title">{title}</h2>
        {actions ? <div className="section-card-actions">{actions}</div> : null}
      </div>
      <div className="section-card-body stack">{children}</div>
    </section>
  )
}