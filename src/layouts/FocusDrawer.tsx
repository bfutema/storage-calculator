import { useEffect, type MouseEvent, type ReactNode } from 'react'
import './FocusDrawer.css'

interface FocusDrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function FocusDrawer({
  open,
  title,
  onClose,
  children,
}: FocusDrawerProps) {
  useEffect(() => {
    if (!open) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div className="focus-drawer" onMouseDown={handleBackdrop}>
      <aside
        className="focus-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-drawer-title"
      >
        <div className="focus-drawer__head">
          <h2 id="focus-drawer-title">{title}</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="focus-drawer__body">{children}</div>
      </aside>
    </div>
  )
}
