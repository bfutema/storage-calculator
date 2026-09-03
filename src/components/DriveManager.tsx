import { useState, type FormEvent } from 'react'
import { CAPACITY_PRESETS, type Drive } from '../types'
import { formatSize, parseSizeInput, type StorageBreakdown } from '../utils/format'
import './DriveManager.css'

interface DriveManagerProps {
  drives: Drive[]
  breakdowns: StorageBreakdown[]
  selectedDriveId: string
  onSelect: (id: string) => void
  onAdd: (name: string, capacityGb: number) => void
  onUpdate: (
    id: string,
    patch: Partial<Pick<Drive, 'name' | 'capacityGb'>>,
  ) => void
  onSetInternal: (id: string) => void
  onRemove: (id: string) => void
  compact?: boolean
}

export function DriveManager({
  drives,
  breakdowns,
  selectedDriveId,
  onSelect,
  onAdd,
  onUpdate,
  onSetInternal,
  onRemove,
  compact = false,
}: DriveManagerProps) {
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('2000')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCapacity, setEditCapacity] = useState('')

  function breakdownFor(id: string) {
    return breakdowns.find((item) => item.driveId === id)
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    const capacityGb = parseSizeInput(capacity, 'GB')
    if (!trimmed) {
      setError('Informe um nome para o SSD.')
      return
    }
    if (capacityGb === null || capacityGb <= 0) {
      setError('Informe uma capacidade válida.')
      return
    }
    onAdd(trimmed, capacityGb)
    setName('')
    setCapacity('2000')
    setError('')
  }

  function startEdit(drive: Drive) {
    setEditingId(drive.id)
    setEditName(drive.name)
    setEditCapacity(String(drive.capacityGb).replace('.', ','))
  }

  function saveEdit(id: string) {
    const capacityGb = parseSizeInput(editCapacity, 'GB')
    if (!editName.trim() || capacityGb === null || capacityGb <= 0) return
    onUpdate(id, { name: editName.trim(), capacityGb })
    setEditingId(null)
  }

  if (compact) {
    return (
      <div className="drive-switcher" role="tablist" aria-label="SSDs">
        {drives.map((drive) => {
          const stats = breakdownFor(drive.id)
          return (
            <button
              key={drive.id}
              type="button"
              role="tab"
              className={`drive-switcher__btn ${selectedDriveId === drive.id ? 'is-active' : ''} ${stats?.isOverCapacity ? 'is-over' : ''}`}
              aria-selected={selectedDriveId === drive.id}
              onClick={() => onSelect(drive.id)}
            >
              <strong>{drive.name}</strong>
              <span>
                {drive.isInternal ? 'Interno' : 'Externo'}
                {stats
                  ? ` · ${Math.round(Math.min(stats.usedPercent, 999))}%`
                  : ''}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <section className="drives">
      <div className="drives__head">
        <h2>Seus SSDs</h2>
        <p>
          Marque o disco interno do Ally e use externos para backup. Depois
          mova cada jogo para o SSD onde ele vai ficar.
        </p>
      </div>

      <ul className="drives__list">
        {drives.map((drive) => {
          const stats = breakdownFor(drive.id)
          const selected = selectedDriveId === drive.id
          const editing = editingId === drive.id

          return (
            <li
              key={drive.id}
              className={`drive-card ${selected ? 'is-selected' : ''} ${stats?.isOverCapacity ? 'is-over' : ''}`}
            >
              {editing ? (
                <div className="drive-card__edit">
                  <label className="field">
                    <span>Nome</span>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Capacidade (GB)</span>
                    <input
                      value={editCapacity}
                      inputMode="decimal"
                      onChange={(e) => setEditCapacity(e.target.value)}
                    />
                  </label>
                  <div className="drive-card__actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => saveEdit(drive.id)}
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
                  <button
                    type="button"
                    className="drive-card__select"
                    onClick={() => onSelect(drive.id)}
                  >
                    <span className="drive-card__title">
                      <strong>{drive.name}</strong>
                      {drive.isInternal ? (
                        <em className="drive-badge">Interno</em>
                      ) : (
                        <em className="drive-badge drive-badge--ext">Externo</em>
                      )}
                    </span>
                    <span className="drive-card__meta">
                      {formatSize(drive.capacityGb)} anunciado
                      {stats
                        ? ` · ${formatSize(stats.gamesGb)} em jogos · ${formatSize(Math.abs(stats.freeGb))} ${stats.isOverCapacity ? 'faltando' : 'livre'}`
                        : ''}
                    </span>
                    {stats ? (
                      <span
                        className="drive-card__bar"
                        aria-hidden="true"
                      >
                        <i
                          style={{
                            width: `${Math.min(stats.usedPercent, 100)}%`,
                          }}
                        />
                      </span>
                    ) : null}
                  </button>

                  <div className="drive-card__actions">
                    {!drive.isInternal ? (
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => onSetInternal(drive.id)}
                      >
                        Marcar interno
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => startEdit(drive)}
                    >
                      Editar
                    </button>
                    {drives.length > 1 ? (
                      <button
                        type="button"
                        className="btn btn--danger"
                        onClick={() => onRemove(drive.id)}
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>

      <form className="drives__add" onSubmit={handleAdd}>
        <h3>Adicionar SSD</h3>
        <div className="drives__add-fields">
          <label className="field">
            <span>Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: SSD externo 2 TB"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Capacidade (GB)</span>
            <input
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              inputMode="decimal"
              placeholder="2000"
            />
          </label>
        </div>
        <div className="capacity__presets" role="group" aria-label="Presets">
          {CAPACITY_PRESETS.map((preset) => (
            <button
              key={preset.valueGb}
              type="button"
              className={`chip ${Number(capacity.replace(',', '.')) === preset.valueGb ? 'is-active' : ''}`}
              onClick={() => setCapacity(String(preset.valueGb))}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {error ? <p className="drives__error">{error}</p> : null}
        <button type="submit" className="btn btn--primary">
          Adicionar SSD
        </button>
      </form>
    </section>
  )
}
