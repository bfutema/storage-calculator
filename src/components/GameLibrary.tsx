import { useEffect, useMemo, useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { Drive, Game, GameSource } from '../types'
import { formatSize } from '../utils/format'
import { ArchiveIcon, ToolsIcon, TrashIcon } from './ActionIcons'
import { GameForm } from './GameForm'
import { GameList, type SortDirection, type SortField, type ViewMode } from './GameList'
import { ViewModePicker } from './ViewModePicker'
import { WishDriveModal } from './WishDriveModal'
import './GameLibrary.css'

type StatusFilter = 'all' | 'counted' | 'wishlist' | 'skipped'
type SizeFilter = 'all' | 'small' | 'medium' | 'large' | 'huge'

const VIEW_STORAGE_KEY = 'storage-calculator:view-mode'

const SIZE_FILTERS: { id: SizeFilter; label: string }[] = [
  { id: 'small', label: 'Até 10 GB' },
  { id: 'medium', label: '10–50 GB' },
  { id: 'large', label: '50–100 GB' },
  { id: 'huge', label: 'Mais de 100 GB' },
]

interface GameLibraryProps {
  games: Game[]
  drives: Drive[]
  sources: GameSource[]
  defaultDriveId?: string
  onAdd: (
    name: string,
    sizeGb: number,
    driveId?: string,
    sourceId?: string,
  ) => void
  onUpdate: (id: string, name: string, sizeGb: number, sourceId?: string) => void
  onToggleCounted: (id: string, counted: boolean) => void
  onSetCounted: (ids: string[], counted: boolean) => void
  onSetDrive: (id: string, driveId: string) => void
  onSetGamesDrive: (ids: string[], driveId: string) => void
  onSetSource: (id: string, sourceId: string) => void
  onSetGamesSource: (ids: string[], sourceId: string) => void
  onToggleWishlist: (id: string, wishlist: boolean, driveId?: string) => void
  onSetWishlist: (ids: string[], wishlist: boolean, driveId?: string) => void
  onAddSource: (name: string) => string | null
  onRemoveSource: (id: string) => void
  onArchive: (id: string) => void
  onUnarchive: (id: string) => void
  onArchiveMany: (ids: string[]) => void
  onRemove: (id: string) => void
  onClear: () => void
  onClearArchived: () => void
  hideForm?: boolean
  fillViewport?: boolean
}

function loadViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    if (stored === 'list' || stored === 'table' || stored === 'cards') {
      return stored
    }
  } catch {
    /* ignore */
  }
  return 'list'
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function matchesSize(sizeGb: number, filter: SizeFilter): boolean {
  if (filter === 'small') return sizeGb < 10
  if (filter === 'medium') return sizeGb >= 10 && sizeGb < 50
  if (filter === 'large') return sizeGb >= 50 && sizeGb < 100
  if (filter === 'huge') return sizeGb >= 100
  return true
}

function sortGames(
  games: Game[],
  field: SortField,
  direction: SortDirection,
): Game[] {
  const factor = direction === 'asc' ? 1 : -1

  return [...games].sort((a, b) => {
    if (field === 'name') {
      return (
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) * factor
      )
    }
    return (a.sizeGb - b.sizeGb) * factor
  })
}

export function GameLibrary({
  games,
  drives,
  sources,
  defaultDriveId,
  onAdd,
  onUpdate,
  onToggleCounted,
  onSetCounted,
  onSetDrive,
  onSetGamesDrive,
  onSetSource,
  onSetGamesSource,
  onToggleWishlist,
  onSetWishlist,
  onAddSource,
  onRemoveSource,
  onArchive,
  onUnarchive,
  onArchiveMany,
  onRemove,
  onClear,
  onClearArchived,
  hideForm = false,
  fillViewport = false,
}: GameLibraryProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all')
  const [driveFilter, setDriveFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode)
  const [sortField, setSortField] = useState<SortField>('size')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [moveTarget, setMoveTarget] = useState(
    defaultDriveId ?? drives[0]?.id ?? '',
  )
  const [sourceTarget, setSourceTarget] = useState(sources[0]?.id ?? '')
  const [newSourceName, setNewSourceName] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [wishDriveOpen, setWishDriveOpen] = useState(false)
  const isCompactViewport = useMediaQuery('(max-width: 560px)')

  const activeGames = useMemo(
    () => games.filter((game) => !game.archived),
    [games],
  )
  const archivedGames = useMemo(
    () =>
      sortGames(
        games.filter((game) => game.archived),
        'name',
        'asc',
      ),
    [games],
  )

  const countedGames = activeGames.filter((game) => game.counted)
  const wishlistGames = activeGames.filter((game) => game.wishlist)
  const countedTotal = countedGames.reduce((sum, game) => sum + game.sizeGb, 0)
  const wishlistTotal = wishlistGames.reduce((sum, game) => sum + game.sizeGb, 0)
  const skippedCount =
    activeGames.length - countedGames.length - wishlistGames.length
  const hasActiveFilters =
    query.trim() !== '' ||
    statusFilter !== 'all' ||
    sizeFilter !== 'all' ||
    driveFilter !== 'all' ||
    sourceFilter !== 'all'

  const activeToolCount = [
    statusFilter !== 'all',
    sizeFilter !== 'all',
    driveFilter !== 'all',
    sourceFilter !== 'all',
  ].filter(Boolean).length

  const visible = useMemo(() => {
    const needle = normalizeText(query)

    const filtered = activeGames.filter((game) => {
      if (statusFilter === 'counted' && !game.counted) return false
      if (statusFilter === 'wishlist' && !game.wishlist) return false
      if (
        statusFilter === 'skipped' &&
        (game.counted || game.wishlist)
      ) {
        return false
      }
      if (driveFilter !== 'all' && game.driveId !== driveFilter) return false
      if (sourceFilter !== 'all' && game.sourceId !== sourceFilter) return false
      if (!matchesSize(game.sizeGb, sizeFilter)) return false
      if (needle && !normalizeText(game.name).includes(needle)) return false
      return true
    })

    return sortGames(filtered, sortField, sortDirection)
  }, [
    activeGames,
    query,
    statusFilter,
    sizeFilter,
    driveFilter,
    sourceFilter,
    sortField,
    sortDirection,
  ])

  useEffect(() => {
    if (!drawerOpen && !archiveOpen) return

    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setDrawerOpen(false)
      setArchiveOpen(false)
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [drawerOpen, archiveOpen])

  function handleAdd(name: string, sizeGb: number, sourceId: string) {
    onAdd(name, sizeGb, defaultDriveId, sourceId)
    setQuery('')
    setStatusFilter('all')
    setSizeFilter('all')
    setDriveFilter('all')
    setSourceFilter('all')
  }

  function handleViewChange(mode: ViewMode) {
    setViewMode(mode)
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection(field === 'name' ? 'asc' : 'desc')
  }

  function clearFilters() {
    setQuery('')
    setStatusFilter('all')
    setSizeFilter('all')
    setDriveFilter('all')
    setSourceFilter('all')
  }

  function toggleStatus(next: StatusFilter) {
    setStatusFilter((prev) => (prev === next ? 'all' : next))
  }

  function toggleSize(next: SizeFilter) {
    setSizeFilter((prev) => (prev === next ? 'all' : next))
  }

  function toggleDrive(next: string) {
    setDriveFilter((prev) => (prev === next ? 'all' : next))
  }

  function toggleSource(next: string) {
    setSourceFilter((prev) => (prev === next ? 'all' : next))
  }

  function handleCreateSource() {
    const id = onAddSource(newSourceName)
    if (!id) return
    setNewSourceName('')
    setSourceTarget(id)
  }

  const visibleIds = visible.map((game) => game.id)
  const visibleCounted = visible.filter((game) => game.counted).length

  const viewToggle = (
    <div className="view-toggle" role="group" aria-label="Modo de visualização">
      <button
        type="button"
        className={viewMode === 'list' ? 'is-active' : ''}
        onClick={() => handleViewChange('list')}
        aria-pressed={viewMode === 'list'}
      >
        Lista
      </button>
      <button
        type="button"
        className={viewMode === 'table' ? 'is-active' : ''}
        onClick={() => handleViewChange('table')}
        aria-pressed={viewMode === 'table'}
      >
        Tabela
      </button>
      <button
        type="button"
        className={viewMode === 'cards' ? 'is-active' : ''}
        onClick={() => handleViewChange('cards')}
        aria-pressed={viewMode === 'cards'}
      >
        Cards
      </button>
    </div>
  )

  const viewControl = isCompactViewport ? (
    <ViewModePicker value={viewMode} onChange={handleViewChange} />
  ) : (
    viewToggle
  )

  const filterGroups = (
    <>
      <div className="library__filter-group" role="group" aria-label="SSD">
        <span>SSD</span>
        {drives.map((drive) => (
          <button
            key={drive.id}
            type="button"
            className={`filter-chip ${driveFilter === drive.id ? 'is-active' : ''}`}
            onClick={() => toggleDrive(drive.id)}
            aria-pressed={driveFilter === drive.id}
          >
            {drive.name}
          </button>
        ))}
      </div>

      <div className="library__filter-group" role="group" aria-label="Origem">
        <span>Origem</span>
        {sources.map((source) => (
          <button
            key={source.id}
            type="button"
            className={`filter-chip ${sourceFilter === source.id ? 'is-active' : ''}`}
            onClick={() => toggleSource(source.id)}
            aria-pressed={sourceFilter === source.id}
          >
            {source.name}
          </button>
        ))}
      </div>

      <div className="library__filter-group" role="group" aria-label="Situação">
        <span>Situação</span>
        <button
          type="button"
          className={`filter-chip ${statusFilter === 'counted' ? 'is-active' : ''}`}
          onClick={() => toggleStatus('counted')}
          aria-pressed={statusFilter === 'counted'}
        >
          Na conta
        </button>
        <button
          type="button"
          className={`filter-chip ${statusFilter === 'wishlist' ? 'is-active' : ''}`}
          onClick={() => toggleStatus('wishlist')}
          aria-pressed={statusFilter === 'wishlist'}
        >
          Desejos
        </button>
        <button
          type="button"
          className={`filter-chip ${statusFilter === 'skipped' ? 'is-active' : ''}`}
          onClick={() => toggleStatus('skipped')}
          aria-pressed={statusFilter === 'skipped'}
        >
          Fora da conta
        </button>
      </div>

      <div className="library__filter-group" role="group" aria-label="Tamanho">
        <span>Tamanho</span>
        {SIZE_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`filter-chip ${sizeFilter === filter.id ? 'is-active' : ''}`}
            onClick={() => toggleSize(filter.id)}
            aria-pressed={sizeFilter === filter.id}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {hasActiveFilters ? (
        <div className="library__filter-group">
          <button
            type="button"
            className="filter-chip"
            onClick={clearFilters}
          >
            Limpar filtros
          </button>
        </div>
      ) : null}
    </>
  )

  const metaActions = (
    <div className="library__meta-actions">
      {hasActiveFilters ? (
        <button type="button" className="btn btn--ghost" onClick={clearFilters}>
          Limpar filtros
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => onSetCounted(visibleIds, true)}
        disabled={visible.length === 0 || visibleCounted === visible.length}
      >
        {hasActiveFilters ? 'Marcar visíveis' : 'Marcar todos'}
      </button>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => onSetCounted(visibleIds, false)}
        disabled={visibleCounted === 0}
      >
        {hasActiveFilters ? 'Desmarcar visíveis' : 'Desmarcar todos'}
      </button>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => {
          if (visible.length === 0) return
          if (drives.length <= 1) {
            onSetWishlist(visibleIds, true, drives[0]?.id)
            if (fillViewport) setDrawerOpen(false)
            return
          }
          setWishDriveOpen(true)
        }}
        disabled={visible.length === 0}
      >
        Marcar desejo
      </button>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => {
          onArchiveMany(visibleIds)
          if (fillViewport) setDrawerOpen(false)
        }}
        disabled={visible.length === 0}
      >
        Arquivar visíveis
      </button>
      <button type="button" className="btn btn--ghost" onClick={onClear}>
        Limpar lista
      </button>
    </div>
  )

  const moveBlock = (
    <div className="library__batch">
      {drives.length > 1 ? (
        <div className="library__move">
          <label>
            <span>Mover visíveis para SSD</span>
            <select
              value={moveTarget || drives[0].id}
              onChange={(e) => setMoveTarget(e.target.value)}
            >
              {drives.map((drive) => (
                <option key={drive.id} value={drive.id}>
                  {drive.name}
                  {drive.isInternal ? ' · interno' : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={visible.length === 0 || !moveTarget}
            onClick={() => {
              onSetGamesDrive(visibleIds, moveTarget)
              if (fillViewport) setDrawerOpen(false)
            }}
          >
            Mover
          </button>
        </div>
      ) : null}

      <div className="library__move">
        <label>
          <span>Definir origem dos visíveis</span>
          <select
            value={sourceTarget || sources[0]?.id || ''}
            onChange={(e) => setSourceTarget(e.target.value)}
          >
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={visible.length === 0 || !sourceTarget}
          onClick={() => {
            onSetGamesSource(visibleIds, sourceTarget)
            if (fillViewport) setDrawerOpen(false)
          }}
        >
          Aplicar
        </button>
      </div>
    </div>
  )

  const sourcesBlock = (
    <section className="library__sources">
      <h4>Origens</h4>
      <p className="library-drawer__note">
        Steam, emuladores e outras categorias. O gauge soma o espaço por
        origem automaticamente.
      </p>
      <ul className="library__sources-list">
        {sources.map((source) => (
          <li key={source.id}>
            <span>{source.name}</span>
            <button
              type="button"
              className="btn btn--danger btn--icon"
              disabled={sources.length <= 1}
              onClick={() => onRemoveSource(source.id)}
              aria-label={`Remover origem ${source.name}`}
              title="Remover"
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>
      <div className="library__move">
        <label>
          <span>Nova origem</span>
          <input
            type="text"
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            placeholder="Ex.: Emulador GameCube"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!newSourceName.trim()}
          onClick={handleCreateSource}
        >
          Adicionar
        </button>
      </div>
    </section>
  )

  const sortBlock = (
    <div className="library__filter-group" role="group" aria-label="Ordenar">
      <span>Ordenar</span>
      <button
        type="button"
        className={`filter-chip ${sortField === 'name' ? 'is-active' : ''}`}
        onClick={() => handleSort('name')}
        aria-pressed={sortField === 'name'}
      >
        Nome
        {sortField === 'name' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
      </button>
      <button
        type="button"
        className={`filter-chip ${sortField === 'size' ? 'is-active' : ''}`}
        onClick={() => handleSort('size')}
        aria-pressed={sortField === 'size'}
      >
        Tamanho
        {sortField === 'size' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
      </button>
    </div>
  )

  const gameList = (
    <GameList
      games={visible}
      drives={drives}
      sources={sources}
      viewMode={viewMode}
      sortField={sortField}
      sortDirection={sortDirection}
      emptyMessage="Nenhum título encontrado com essa busca."
      hideSort={fillViewport}
      onSort={handleSort}
      onUpdate={onUpdate}
      onToggleCounted={onToggleCounted}
      onSetDrive={onSetDrive}
      onSetSource={onSetSource}
      onToggleWishlist={onToggleWishlist}
      onArchive={onArchive}
      onRemove={onRemove}
    />
  )

  function driveName(driveId: string) {
    return drives.find((drive) => drive.id === driveId)?.name ?? 'SSD'
  }

  const archivePanel =
    archiveOpen ? (
      <div
        className="library-drawer"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setArchiveOpen(false)
        }}
      >
        <aside
          className="library-drawer__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-drawer-title"
        >
          <div className="library-drawer__head">
            <h3 id="archive-drawer-title">
              Jogos arquivados
              {archivedGames.length > 0 ? ` (${archivedGames.length})` : ''}
            </h3>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setArchiveOpen(false)}
            >
              Fechar
            </button>
          </div>

          <div className="library-drawer__body">
            {archivedGames.length === 0 ? (
              <p className="library-drawer__note">
                Nenhum jogo arquivado. Use Arquivar para tirar títulos da lista
                sem apagar.
              </p>
            ) : (
              <>
                <div className="library__meta-actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={onClearArchived}
                  >
                    Limpar arquivados
                  </button>
                </div>
                <ul className="archive-list">
                  {archivedGames.map((game) => (
                    <li key={game.id} className="archive-list__item">
                      <div>
                        <strong>{game.name}</strong>
                        <span>
                          {formatSize(game.sizeGb)} · {driveName(game.driveId)}
                        </span>
                      </div>
                      <div className="game-row__actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => onUnarchive(game.id)}
                        >
                          Restaurar
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--icon"
                          onClick={() => onRemove(game.id)}
                          aria-label={`Remover ${game.name}`}
                          title="Remover"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>
    ) : null

  return (
    <div
      className={['library', fillViewport ? 'library--fill' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="library__intro">
        <div className="library__intro-copy">
          <h2>Biblioteca de jogos</h2>
          {activeGames.length > 0 ? (
            <p>
              {countedGames.length} de {activeGames.length}{' '}
              {activeGames.length === 1 ? 'jogo' : 'jogos'} ·{' '}
              {formatSize(countedTotal)}
              {wishlistGames.length > 0
                ? ` · ${wishlistGames.length} desejo${wishlistGames.length === 1 ? '' : 's'} · ${formatSize(wishlistTotal)}`
                : ''}
              {skippedCount > 0 ? ` · ${skippedCount} fora da conta` : ''}
              {hasActiveFilters
                ? ` · ${visible.length} ${visible.length === 1 ? 'visível' : 'visíveis'}`
                : ''}
            </p>
          ) : (
            <p>Adicione os títulos que pretende instalar.</p>
          )}
        </div>

        <div className="library__intro-actions">
          <button
            type="button"
            className={`library__tools-btn ${isCompactViewport ? 'library__tools-btn--icon' : ''} ${archiveOpen ? 'is-active' : ''}`}
            onClick={() => {
              setDrawerOpen(false)
              setArchiveOpen(true)
            }}
            aria-haspopup="dialog"
            aria-expanded={archiveOpen}
            aria-label={isCompactViewport ? 'Arquivados' : undefined}
            title={isCompactViewport ? 'Arquivados' : undefined}
          >
            {isCompactViewport ? <ArchiveIcon size={18} /> : 'Arquivados'}
            {archivedGames.length > 0 ? <em>{archivedGames.length}</em> : null}
          </button>
          {fillViewport && activeGames.length > 0 ? (
            <button
              type="button"
              className={`library__tools-btn ${isCompactViewport ? 'library__tools-btn--icon' : ''} ${drawerOpen ? 'is-active' : ''} ${activeToolCount > 0 ? 'has-filters' : ''}`}
              onClick={() => {
                setArchiveOpen(false)
                setDrawerOpen(true)
              }}
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              aria-label={isCompactViewport ? 'Ferramentas' : undefined}
              title={isCompactViewport ? 'Ferramentas' : undefined}
            >
              {isCompactViewport ? <ToolsIcon size={18} /> : 'Ferramentas'}
              {activeToolCount > 0 ? <em>{activeToolCount}</em> : null}
            </button>
          ) : null}
        </div>
      </div>

      {hideForm ? null : (
        <GameForm
          className="game-form--wide"
          sources={sources}
          onAdd={handleAdd}
          onAddSource={onAddSource}
        />
      )}

      {activeGames.length > 0 ? (
        <>
          {fillViewport ? (
            <div className="library__compact-bar">
              <label className="library__search">
                <span className="visually-hidden">Buscar jogos</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome…"
                  autoComplete="off"
                />
              </label>
              {viewControl}
            </div>
          ) : (
            <>
              <div className="library__toolbar">
                <label className="library__search">
                  <span className="visually-hidden">Buscar jogos</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome…"
                    autoComplete="off"
                  />
                </label>
                {viewControl}
              </div>

              <div className="library__filters">{filterGroups}</div>

              <div className="library__meta">
                <p>
                  {hasActiveFilters
                    ? `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}`
                    : 'Todos os títulos'}
                </p>
                {metaActions}
              </div>

              {moveBlock}

              {sourcesBlock}
            </>
          )}

          <div className="library__browse">{gameList}</div>

          {fillViewport && drawerOpen ? (
            <div
              className="library-drawer"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setDrawerOpen(false)
              }}
            >
              <aside
                className="library-drawer__panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="library-drawer-title"
              >
                <div className="library-drawer__head">
                  <h3 id="library-drawer-title">Ferramentas</h3>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setDrawerOpen(false)}
                  >
                    Fechar
                  </button>
                </div>

                <div className="library-drawer__body">
                  <section className="library-drawer__section">
                    <h4>Filtros</h4>
                    <div className="library__filters library__filters--stack">
                      {filterGroups}
                    </div>
                  </section>

                  <section className="library-drawer__section">
                    <h4>Ordenação</h4>
                    {sortBlock}
                  </section>

                  <section className="library-drawer__section">
                    <h4>Ações</h4>
                    <p className="library-drawer__note">
                      {hasActiveFilters
                        ? `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}`
                        : 'Todos os títulos'}
                    </p>
                    {metaActions}
                  </section>

                  {moveBlock ? (
                    <section className="library-drawer__section">
                      <h4>Lote</h4>
                      {moveBlock}
                    </section>
                  ) : null}

                  <section className="library-drawer__section">
                    {sourcesBlock}
                  </section>
                </div>
              </aside>
            </div>
          ) : null}
        </>
      ) : (
        <div className="library__empty">
          <p>
            {fillViewport
              ? 'Nenhum jogo ativo. Use o botão + para adicionar ou restaure um arquivado.'
              : 'Nenhum jogo ativo. Use o formulário ou restaure um título arquivado.'}
          </p>
        </div>
      )}

      {archivePanel}

      <WishDriveModal
        open={wishDriveOpen}
        drives={drives}
        defaultDriveId={defaultDriveId ?? drives[0]?.id ?? ''}
        title="Marcar desejos"
        description={
          visible.length === 1
            ? `Em qual SSD “${visible[0].name}” será instalado no futuro?`
            : `Em qual SSD os ${visible.length} jogos visíveis serão instalados no futuro?`
        }
        confirmLabel={
          visible.length === 1
            ? 'Marcar desejo'
            : `Marcar ${visible.length} desejos`
        }
        onClose={() => setWishDriveOpen(false)}
        onConfirm={(driveId) => {
          onSetWishlist(visibleIds, true, driveId)
          if (fillViewport) setDrawerOpen(false)
        }}
      />
    </div>
  )
}
