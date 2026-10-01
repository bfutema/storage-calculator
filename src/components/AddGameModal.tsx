import { useEffect, type MouseEvent } from 'react'
import type { GameSource } from '../types'
import { GameForm, type GameFormValues } from './GameForm'
import './AddGameModal.css'

interface AddGameModalProps {
  open: boolean
  onClose: () => void
  sources: GameSource[]
  franchiseSuggestions?: string[]
  defaultSourceId?: string
  onAdd: (values: GameFormValues) => void
  onAddSource?: (name: string) => string | null
}

export function AddGameModal({
  open,
  onClose,
  sources,
  franchiseSuggestions,
  defaultSourceId,
  onAdd,
  onAddSource,
}: AddGameModalProps) {
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

  function handleAdd(values: GameFormValues) {
    onAdd(values)
    onClose()
  }

  return (
    <div className="modal" onMouseDown={handleBackdrop}>
      <div
        className="modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-game-title"
      >
        <div className="modal__head">
          <h2 id="add-game-title">Adicionar jogo</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        <GameForm
          className="game-form--modal"
          autoFocus
          sources={sources}
          franchiseSuggestions={franchiseSuggestions}
          defaultSourceId={defaultSourceId}
          onAdd={handleAdd}
          onAddSource={onAddSource}
        />
      </div>
    </div>
  )
}
