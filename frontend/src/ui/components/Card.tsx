import type { ReactNode } from 'react'

export function Card({ children }: { children: ReactNode }) {
  return <section className="card stack">{children}</section>
}
