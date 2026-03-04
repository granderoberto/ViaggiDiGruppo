import type { ReactNode } from 'react'

type BadgeVariant = 'planned' | 'done'

interface BadgeProps {
  variant: BadgeVariant
  children: ReactNode
}

export function Badge({ variant, children }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}
