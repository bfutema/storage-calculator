import {
  useEffect,
  useState,
  type AnimationEvent,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
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
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }

    if (mounted) setClosing(true)
  }, [open, mounted])

  useEffect(() => {
    if (!mounted || closing) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setClosing(true)
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
    }
  }, [mounted, closing])

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !closing) return
    setMounted(false)
    setClosing(false)
    if (open) onClose()
  }

  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) setClosing(true)
  }

  function handleAdd(values: GameFormValues) {
    onAdd(values)
    setClosing(true)
  }

  if (!mounted) return null

  return createPortal(
    <div
      className={`modal ${closing ? 'is-closing' : 'is-open'}`}
      onMouseDown={handleBackdrop}
    >
      <div
        className={`modal__dialog ${closing ? 'is-closing' : 'is-open'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-game-title"
        onAnimationEnd={handleAnimationEnd}
      >
        <div className="modal__handle" aria-hidden="true" />
        <div className="modal__head">
          <h2 id="add-game-title">Adicionar jogo</h2>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setClosing(true)}
          >
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
    </div>,
    document.body,
  )
}
