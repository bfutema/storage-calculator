import { useState, type FormEvent } from 'react'
import type { Drive, Game, GameSource } from '../types'
import { formatSize, parseSizeInput } from '../utils/format'
import './GameList.css'

export type ViewMode = 'list' | 'table' | 'cards'
export type SortField = 'name' | 'size'
export type SortDirection = 'asc' | 'desc'

interface GameListProps {
  games: Game[]
  drives: Drive[]
  sources: GameSource[]
  viewMode: ViewMode
  sortField: SortField
  sortDirection: SortDirection
  emptyMessage: string
  hideSort?: boolean
  onSort: (field: SortField) => void
  onUpdate: (id: string, name: string, sizeGb: number, sourceId?: string) => void
  onToggleCounted: (id: string, counted: boolean) => void
  onSetDrive: (id: string, driveId: string) => void
  onSetSource: (id: string, sourceId: string) => void
  onArchive: (id: string) => void
  onRemove: (id: string) => void
}

export function GameList({
  games,
  drives,
  sources,
  viewMode,
  sortField,
  sortDirection,
  emptyMessage,
  hideSort = false,
  onSort,
  onUpdate,
  onToggleCounted,
  onSetDrive,
  onSetSource,
  onArchive,
  onRemove,
}: GameListProps) {
  if (games.length === 0) {
    return (
      <div className="game-list game-list--empty">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  const shared = {
    games,
    drives,
    sources,
    sortField,
    sortDirection,
    hideSort,
    onSort,
    onUpdate,
    onToggleCounted,
    onSetDrive,
    onSetSource,
    onArchive,
    onRemove,
  }

  if (viewMode === 'table') return <TableView {...shared} />
  if (viewMode === 'cards') return <CardsView {...shared} />
  return <ListView {...shared} />
}

interface ViewProps {
  games: Game[]
  drives: Drive[]
  sources: GameSource[]
  sortField: SortField
  sortDirection: SortDirection
  hideSort?: boolean
  onSort: (field: SortField) => void
  onUpdate: (id: string, name: string, sizeGb: number, sourceId?: string) => void
  onToggleCounted: (id: string, counted: boolean) => void
  onSetDrive: (id: string, driveId: string) => void
  onSetSource: (id: string, sourceId: string) => void
  onArchive: (id: string) => void
  onRemove: (id: string) => void
}

function SortButtons({
  sortField,
  sortDirection,
  onSort,
}: Pick<ViewProps, 'sortField' | 'sortDirection' | 'onSort'>) {
  return (
    <div className="game-list__sort" role="group" aria-label="Ordenar">
      <span>Ordenar</span>
      <SortButton
        label="Nome"
        field="name"
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
      />
      <SortButton
        label="Tamanho"
        field="size"
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
      />
    </div>
  )
}

function SortButton({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
}: {
  label: string
  field: SortField
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
}) {
  const active = sortField === field
  return (
    <button
      type="button"
      className={`sort-btn ${active ? 'is-active' : ''}`}
      onClick={() => onSort(field)}
      aria-pressed={active}
    >
      {label}
      {active ? (
        <em aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</em>
      ) : null}
    </button>
  )
}

function DriveSelect({
  game,
  drives,
  onSetDrive,
}: {
  game: Game
  drives: Drive[]
  onSetDrive: (id: string, driveId: string) => void
}) {
  return (
    <label className="drive-select">
      <span className="visually-hidden">SSD de {game.name}</span>
      <select
        value={game.driveId}
        onChange={(e) => onSetDrive(game.id, e.target.value)}
        aria-label={`Mover ${game.name} para outro SSD`}
      >
        {drives.map((drive) => (
          <option key={drive.id} value={drive.id}>
            {drive.isInternal ? `${drive.name} · interno` : drive.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function SourceSelect({
  game,
  sources,
  onSetSource,
}: {
  game: Game
  sources: GameSource[]
  onSetSource: (id: string, sourceId: string) => void
}) {
  return (
    <label className="drive-select source-select">
      <span className="visually-hidden">Origem de {game.name}</span>
      <select
        value={game.sourceId}
        onChange={(e) => onSetSource(game.id, e.target.value)}
        aria-label={`Origem de ${game.name}`}
      >
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function ListView(props: ViewProps) {
  const {
    games,
    drives,
    sources,
    sortField,
    sortDirection,
    hideSort = false,
    onSort,
    onUpdate,
    onToggleCounted,
    onSetDrive,
    onSetSource,
    onArchive,
    onRemove,
  } = props

  return (
    <div className="game-list">
      {hideSort ? null : (
        <SortButtons
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      )}
      <ul className="game-list__items">
        {games.map((game, index) => (
          <GameRow
            key={game.id}
            game={game}
            drives={drives}
            sources={sources}
            index={index}
            onUpdate={onUpdate}
            onToggleCounted={onToggleCounted}
            onSetDrive={onSetDrive}
            onSetSource={onSetSource}
            onArchive={onArchive}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </div>
  )
}

function TableView(props: ViewProps) {
  const {
    games,
    drives,
    sources,
    sortField,
    sortDirection,
    onSort,
    onUpdate,
    onToggleCounted,
    onSetDrive,
    onSetSource,
    onArchive,
    onRemove,
  } = props

  return (
    <div className="game-table-wrap">
      <table className="game-table">
        <thead>
          <tr>
            <th className="game-table__check">Na conta</th>
            <th>
              <button
                type="button"
                className={`table-sort ${sortField === 'name' ? 'is-active' : ''}`}
                onClick={() => onSort('name')}
              >
                Jogo
                {sortField === 'name' ? (
                  <em aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</em>
                ) : null}
              </button>
            </th>
            <th>
              <button
                type="button"
                className={`table-sort ${sortField === 'size' ? 'is-active' : ''}`}
                onClick={() => onSort('size')}
              >
                Tamanho
                {sortField === 'size' ? (
                  <em aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</em>
                ) : null}
              </button>
            </th>
            <th>Origem</th>
            <th>SSD</th>
            <th>Situação</th>
            <th className="game-table__actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game, index) => (
            <TableRow
              key={game.id}
              game={game}
              drives={drives}
              sources={sources}
              index={index}
              onUpdate={onUpdate}
              onToggleCounted={onToggleCounted}
              onSetDrive={onSetDrive}
              onSetSource={onSetSource}
              onArchive={onArchive}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CardsView(props: ViewProps) {
  const {
    games,
    drives,
    sources,
    sortField,
    sortDirection,
    hideSort = false,
    onSort,
    onUpdate,
    onToggleCounted,
    onSetDrive,
    onSetSource,
    onArchive,
    onRemove,
  } = props

  return (
    <div className="game-list">
      {hideSort ? null : (
        <SortButtons
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      )}
      <ul className="game-cards">
        {games.map((game, index) => (
          <GameCard
            key={game.id}
            game={game}
            drives={drives}
            sources={sources}
            index={index}
            onUpdate={onUpdate}
            onToggleCounted={onToggleCounted}
            onSetDrive={onSetDrive}
            onSetSource={onSetSource}
            onArchive={onArchive}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </div>
  )
}

interface ItemProps {
  game: Game
  drives: Drive[]
  sources: GameSource[]
  index: number
  onUpdate: (id: string, name: string, sizeGb: number, sourceId?: string) => void
  onToggleCounted: (id: string, counted: boolean) => void
  onSetDrive: (id: string, driveId: string) => void
  onSetSource: (id: string, sourceId: string) => void
  onArchive: (id: string) => void
  onRemove: (id: string) => void
}

function useGameEdit(
  game: Game,
  onUpdate: (id: string, name: string, sizeGb: number, sourceId?: string) => void,
) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(game.name)
  const [size, setSize] = useState(String(game.sizeGb).replace('.', ','))
  const [sourceId, setSourceId] = useState(game.sourceId)
  const [error, setError] = useState('')

  function startEdit() {
    setName(game.name)
    setSize(String(game.sizeGb).replace('.', ','))
    setSourceId(game.sourceId)
    setError('')
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setError('')
  }

  function save(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    const sizeGb = parseSizeInput(size, 'GB')

    if (!trimmed) {
      setError('Nome obrigatório.')
      return
    }
    if (sizeGb === null || sizeGb <= 0) {
      setError('Tamanho inválido.')
      return
    }

    onUpdate(game.id, trimmed, sizeGb, sourceId)
    setEditing(false)
  }

  return {
    editing,
    name,
    size,
    sourceId,
    error,
    setName,
    setSize,
    setSourceId,
    startEdit,
    cancel,
    save,
  }
}

function CountToggle({
  game,
  onToggleCounted,
}: {
  game: Game
  onToggleCounted: (id: string, counted: boolean) => void
}) {
  return (
    <label className="game-row__count">
      <input
        type="checkbox"
        checked={game.counted}
        onChange={(e) => onToggleCounted(game.id, e.target.checked)}
        aria-label={
          game.counted
            ? `Descontar ${game.name} da contagem`
            : `Contabilizar ${game.name}`
        }
      />
      <span className="game-row__check" aria-hidden="true" />
    </label>
  )
}

function GameEditor({
  name,
  size,
  sourceId,
  sources,
  error,
  onNameChange,
  onSizeChange,
  onSourceChange,
  onSave,
  onCancel,
}: {
  name: string
  size: string
  sourceId: string
  sources: GameSource[]
  error: string
  onNameChange: (value: string) => void
  onSizeChange: (value: string) => void
  onSourceChange: (value: string) => void
  onSave: (event: FormEvent) => void
  onCancel: () => void
}) {
  return (
    <form onSubmit={onSave} className="game-row__edit">
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        aria-label="Nome do jogo"
      />
      <div className="game-row__edit-size">
        <input
          value={size}
          onChange={(e) => onSizeChange(e.target.value)}
          inputMode="decimal"
          aria-label="Tamanho em GB"
        />
        <span>GB</span>
      </div>
      <label className="drive-select source-select">
        <span className="visually-hidden">Origem</span>
        <select
          value={sourceId}
          onChange={(e) => onSourceChange(e.target.value)}
          aria-label="Origem do jogo"
        >
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="game-row__error">{error}</p> : null}
      <div className="game-row__actions">
        <button type="submit" className="btn btn--ghost">
          Salvar
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function ItemActions({
  onEdit,
  onArchive,
  onRemove,
}: {
  onEdit: () => void
  onArchive: () => void
  onRemove: () => void
}) {
  return (
    <div className="game-row__actions">
      <button type="button" className="btn btn--ghost" onClick={onEdit}>
        Editar
      </button>
      <button type="button" className="btn btn--ghost" onClick={onArchive}>
        Arquivar
      </button>
      <button type="button" className="btn btn--danger" onClick={onRemove}>
        Remover
      </button>
    </div>
  )
}

function GameRow({
  game,
  drives,
  sources,
  index,
  onUpdate,
  onToggleCounted,
  onSetDrive,
  onSetSource,
  onArchive,
  onRemove,
}: ItemProps) {
  const edit = useGameEdit(game, onUpdate)
  const delay = `${Math.min(index, 12) * 30}ms`
  const sourceName =
    sources.find((source) => source.id === game.sourceId)?.name ?? 'Origem'

  if (edit.editing) {
    return (
      <li className="game-row game-row--editing" style={{ animationDelay: delay }}>
        <GameEditor
          name={edit.name}
          size={edit.size}
          sourceId={edit.sourceId}
          sources={sources}
          error={edit.error}
          onNameChange={edit.setName}
          onSizeChange={edit.setSize}
          onSourceChange={edit.setSourceId}
          onSave={edit.save}
          onCancel={edit.cancel}
        />
      </li>
    )
  }

  return (
    <li
      className={`game-row ${game.counted ? '' : 'game-row--skipped'}`.trim()}
      style={{ animationDelay: delay }}
    >
      <CountToggle game={game} onToggleCounted={onToggleCounted} />
      <div className="game-row__main">
        <strong>{game.name}</strong>
        <span>
          {formatSize(game.sizeGb)} · {sourceName}
          {!game.counted ? ' · fora da conta' : ''}
        </span>
      </div>
      <SourceSelect game={game} sources={sources} onSetSource={onSetSource} />
      <DriveSelect game={game} drives={drives} onSetDrive={onSetDrive} />
      <ItemActions
        onEdit={edit.startEdit}
        onArchive={() => onArchive(game.id)}
        onRemove={() => onRemove(game.id)}
      />
    </li>
  )
}

function TableRow({
  game,
  drives,
  sources,
  index,
  onUpdate,
  onToggleCounted,
  onSetDrive,
  onSetSource,
  onArchive,
  onRemove,
}: ItemProps) {
  const edit = useGameEdit(game, onUpdate)
  const delay = `${Math.min(index, 12) * 30}ms`

  if (edit.editing) {
    return (
      <tr className="game-table__edit-row" style={{ animationDelay: delay }}>
        <td colSpan={7}>
          <GameEditor
            name={edit.name}
            size={edit.size}
            sourceId={edit.sourceId}
            sources={sources}
            error={edit.error}
            onNameChange={edit.setName}
            onSizeChange={edit.setSize}
            onSourceChange={edit.setSourceId}
            onSave={edit.save}
            onCancel={edit.cancel}
          />
        </td>
      </tr>
    )
  }

  return (
    <tr
      className={game.counted ? undefined : 'game-row--skipped'}
      style={{ animationDelay: delay }}
    >
      <td className="game-table__check">
        <CountToggle game={game} onToggleCounted={onToggleCounted} />
      </td>
      <td className="game-table__name">{game.name}</td>
      <td className="game-table__size">{formatSize(game.sizeGb)}</td>
      <td>
        <SourceSelect game={game} sources={sources} onSetSource={onSetSource} />
      </td>
      <td>
        <DriveSelect game={game} drives={drives} onSetDrive={onSetDrive} />
      </td>
      <td>{game.counted ? 'Na conta' : 'Fora da conta'}</td>
      <td className="game-table__actions">
        <ItemActions
          onEdit={edit.startEdit}
          onArchive={() => onArchive(game.id)}
          onRemove={() => onRemove(game.id)}
        />
      </td>
    </tr>
  )
}

function GameCard({
  game,
  drives,
  sources,
  index,
  onUpdate,
  onToggleCounted,
  onSetDrive,
  onSetSource,
  onArchive,
  onRemove,
}: ItemProps) {
  const edit = useGameEdit(game, onUpdate)
  const delay = `${Math.min(index, 12) * 30}ms`

  return (
    <li
      className={`game-card ${game.counted ? 'game-card--counted' : 'game-row--skipped'}`.trim()}
      style={{ animationDelay: delay }}
    >
      {edit.editing ? (
        <GameEditor
          name={edit.name}
          size={edit.size}
          sourceId={edit.sourceId}
          sources={sources}
          error={edit.error}
          onNameChange={edit.setName}
          onSizeChange={edit.setSize}
          onSourceChange={edit.setSourceId}
          onSave={edit.save}
          onCancel={edit.cancel}
        />
      ) : (
        <>
          <div className="game-card__top">
            <CountToggle game={game} onToggleCounted={onToggleCounted} />
            <span className="game-card__status">
              {game.counted ? 'Na conta' : 'Fora da conta'}
            </span>
          </div>
          <strong>{game.name}</strong>
          <span className="game-card__size">{formatSize(game.sizeGb)}</span>
          <SourceSelect game={game} sources={sources} onSetSource={onSetSource} />
          <DriveSelect game={game} drives={drives} onSetDrive={onSetDrive} />
          <ItemActions
            onEdit={edit.startEdit}
            onArchive={() => onArchive(game.id)}
            onRemove={() => onRemove(game.id)}
          />
        </>
      )}
    </li>
  )
}
