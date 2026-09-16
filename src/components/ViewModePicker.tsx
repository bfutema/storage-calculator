import { useEffect, useState, type ReactNode } from 'react'
import { CardsViewIcon, ListViewIcon, TableViewIcon } from './ActionIcons'
import type { ViewMode } from './GameList'
import './ViewModePicker.css'

const OPTIONS: { id: ViewMode; label: string; icon: ReactNode }[] = [
  { id: 'list', label: 'Lista', icon: <ListViewIcon /> },
  { id: 'table', label: 'Tabela', icon: <TableViewIcon /> },
  { id: 'cards', label: 'Cards', icon: <CardsViewIcon /> },
]

interface ViewModePickerProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

/** Alternativa compacta ao grupo de botões: um ícone que abre as opções. */
export function ViewModePicker({ value, onChange }: ViewModePickerProps) {
  const [open, setOpen] = useState(false)
  const current = OPTIONS.find((option) => option.id === value) ?? OPTIONS[0]

  useEffect(() => {
    if (!open) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div className="view-picker">
      <button
        type="button"
        className={`view-picker__trigger ${open ? 'is-active' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Visualização: ${current.label}`}
        title={`Visualização: ${current.label}`}
      >
        {current.icon}
      </button>

      {open ? (
        <>
          <div
            className="view-picker__backdrop"
            onMouseDown={() => setOpen(false)}
          />
          <div className="view-picker__menu" role="menu">
            {OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={option.id === value}
                className={`view-picker__item ${option.id === value ? 'is-active' : ''}`}
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                }}
              >
                {option.icon}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
