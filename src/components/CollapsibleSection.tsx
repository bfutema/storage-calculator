import { useState, type ReactNode, type SyntheticEvent } from 'react'
import './CollapsibleSection.css'

interface CollapsibleSectionProps {
  title: string
  storageKey?: string
  defaultOpen?: boolean
  summary?: string
  children: ReactNode
}

function loadOpen(storageKey: string | undefined, defaultOpen: boolean) {
  if (!storageKey) return defaultOpen
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch {
    /* ignore */
  }
  return defaultOpen
}

function persistOpen(storageKey: string | undefined, open: boolean) {
  if (!storageKey) return
  try {
    localStorage.setItem(storageKey, open ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function CollapsibleSection({
  title,
  storageKey,
  defaultOpen = false,
  summary,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(() => loadOpen(storageKey, defaultOpen))

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    const next = event.currentTarget.open
    setOpen(next)
    persistOpen(storageKey, next)
  }

  return (
    <details className="collapse" open={open} onToggle={handleToggle}>
      <summary className="collapse__trigger">
        <span className="collapse__copy">
          <span className="collapse__title">{title}</span>
          {summary ? (
            <span className="collapse__summary">{summary}</span>
          ) : null}
        </span>
        <span className="collapse__chevron" aria-hidden="true" />
      </summary>
      <div className="collapse__body">{children}</div>
    </details>
  )
}
