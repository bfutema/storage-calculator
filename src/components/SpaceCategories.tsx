import { useState, type FormEvent } from 'react'
import type { SpaceCategory } from '../types'
import { formatSize, parseSizeInput } from '../utils/format'
import './SpaceCategories.css'

interface SpaceCategoriesProps {
  driveId: string
  driveName: string
  categories: SpaceCategory[]
  onAdd: (driveId: string, name: string, sizeGb: number) => void
  onUpdate: (
    id: string,
    patch: Partial<Pick<SpaceCategory, 'name' | 'sizeGb'>>,
  ) => void
  onRemove: (id: string) => void
  compact?: boolean
}

export function SpaceCategories({
  driveId,
  driveName,
  categories,
  onAdd,
  onUpdate,
  onRemove,
  compact = false,
}: SpaceCategoriesProps) {
  const driveCategories = categories.filter(
    (category) => category.driveId === driveId,
  )
  const [name, setName] = useState('')
  const [size, setSize] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSize, setEditSize] = useState('')

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    const sizeGb = parseSizeInput(size, 'GB')
    if (!trimmed) {
      setError('Informe o nome.')
      return
    }
    if (sizeGb === null) {
      setError('Informe um tamanho válido.')
      return
    }
    onAdd(driveId, trimmed, sizeGb)
    setName('')
    setSize('')
    setError('')
  }

  function startEdit(category: SpaceCategory) {
    setEditingId(category.id)
    setEditName(category.name)
    setEditSize(String(category.sizeGb).replace('.', ','))
  }

  function saveEdit(id: string) {
    const sizeGb = parseSizeInput(editSize, 'GB')
    if (!editName.trim() || sizeGb === null) return
    onUpdate(id, { name: editName.trim(), sizeGb })
    setEditingId(null)
  }

  return (
    <section
      className={compact ? 'space-cats space-cats--compact' : 'space-cats'}
    >
      <div className="space-cats__head">
        <h3>Uso fora dos jogos</h3>
        <p>
          Cadastre pastas e reservas reais deste SSD ({driveName}) para bater
          com o que o Windows mostra.
        </p>
      </div>

      {driveCategories.length === 0 ? (
        <p className="space-cats__empty">Nenhuma categoria ainda.</p>
      ) : (
        <ul className="space-cats__list">
          {driveCategories.map((category) => (
            <li key={category.id} className="space-cats__item">
              {editingId === category.id ? (
                <div className="space-cats__edit">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Nome da categoria"
                  />
                  <div className="space-cats__size-row">
                    <input
                      value={editSize}
                      onChange={(e) => setEditSize(e.target.value)}
                      inputMode="decimal"
                      aria-label="Tamanho em GB"
                    />
                    <span>GB</span>
                  </div>
                  <div className="space-cats__actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => saveEdit(category.id)}
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-cats__copy">
                    <strong>{category.name}</strong>
                    <span>{formatSize(category.sizeGb)}</span>
                  </div>
                  <div className="space-cats__actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => startEdit(category)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => onRemove(category.id)}
                    >
                      Remover
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="space-cats__add" onSubmit={handleAdd}>
        <label className="field">
          <span>Categoria</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Users, Windows, Steam"
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Tamanho (GB)</span>
          <input
            value={size}
            onChange={(e) => setSize(e.target.value)}
            inputMode="decimal"
            placeholder="120"
          />
        </label>
        {error ? <p className="space-cats__error">{error}</p> : null}
        <button type="submit" className="btn btn--primary">
          Adicionar
        </button>
      </form>
    </section>
  )
}
