import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Drive } from '../types'
import './WishDriveModal.css'

interface WishDriveModalProps {
  open: boolean
  drives: Drive[]
  defaultDriveId: string
  title?: string
  description?: string
  confirmLabel?: string
  onClose: () => void
  onConfirm: (driveId: string) => void
}

export function WishDriveModal({
  open,
  drives,
  defaultDriveId,
  title = 'Lista de desejos',
  description = 'Em qual SSD este jogo será instalado no futuro?',
  confirmLabel = 'Marcar desejo',
  onClose,
  onConfirm,
}: WishDriveModalProps) {
  const fallbackId = drives[0]?.id ?? ''
  const initialId = drives.some((drive) => drive.id === defaultDriveId)
    ? defaultDriveId
    : fallbackId
  const [driveId, setDriveId] = useState(initialId)

  useEffect(() => {
    if (!open) return
    setDriveId(
      drives.some((drive) => drive.id === defaultDriveId)
        ? defaultDriveId
        : (drives[0]?.id ?? ''),
    )
  }, [open, defaultDriveId, drives])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open || drives.length === 0) return null

  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!driveId) return
    onConfirm(driveId)
    onClose()
  }

  return createPortal(
    <div className="wish-modal" onMouseDown={handleBackdrop}>
      <div
        className="wish-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wish-drive-title"
      >
        <div className="wish-modal__head">
          <h2 id="wish-drive-title">{title}</h2>
          <button
            type="button"
            className="wish-modal__ghost"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
        <form className="wish-modal__form" onSubmit={handleSubmit}>
          <p className="wish-modal__hint">{description}</p>
          <label className="wish-modal__field">
            <span>SSD de destino</span>
            <select
              value={driveId}
              onChange={(e) => setDriveId(e.target.value)}
              autoFocus
            >
              {drives.map((drive) => (
                <option key={drive.id} value={drive.id}>
                  {drive.isInternal ? `${drive.name} · interno` : drive.name}
                </option>
              ))}
            </select>
          </label>
          <div className="wish-modal__actions">
            <button
              type="button"
              className="wish-modal__ghost"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="wish-modal__confirm"
              disabled={!driveId}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
