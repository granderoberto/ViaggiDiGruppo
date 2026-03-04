import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  actions: ReactNode
  onClose: () => void
}

export function Modal({ open, title, children, actions, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const previousActiveElement = document.activeElement as HTMLElement | null
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    firstFocusable?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousActiveElement?.focus()
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="modal-title" className="modal-title">
          {title}
        </h2>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  )
}
