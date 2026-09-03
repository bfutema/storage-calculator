import { useEffect, useState } from 'react'
import { AddGameModal } from './components/AddGameModal'
import { CapacitySetup } from './components/CapacitySetup'
import { CollapsibleSection } from './components/CollapsibleSection'
import { DiskGauge } from './components/DiskGauge'
import { DriveManager } from './components/DriveManager'
import { FreeCalibration } from './components/FreeCalibration'
import { GameLibrary } from './components/GameLibrary'
import { SpaceCategories } from './components/SpaceCategories'
import { useLibrary } from './hooks/useLibrary'
import { getDriveById, getInternalDrive } from './types'
import {
  calculateAllBreakdowns,
  calculateBreakdown,
  formatSize,
} from './utils/format'
import './App.css'

const FOCUS_STORAGE_KEY = 'storage-calculator:focus-mode'

function loadFocusMode(): boolean {
  try {
    return localStorage.getItem(FOCUS_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function App() {
  const {
    state,
    setUpdateBufferPercent,
    setUseBinaryConversion,
    setSsdOverheadPercent,
    addDrive,
    updateDrive,
    setInternalDrive,
    removeDrive,
    addCategory,
    updateCategory,
    removeCategory,
    addSource,
    removeSource,
    addGame,
    updateGame,
    setGameSource,
    setGamesSource,
    setGameDrive,
    setGamesDrive,
    setGameCounted,
    setGamesCounted,
    setGameArchived,
    setGamesArchived,
    removeGame,
    clearGames,
    clearArchivedGames,
  } = useLibrary()

  const [focusMode, setFocusMode] = useState(loadFocusMode)
  const [addOpen, setAddOpen] = useState(false)
  const internal = getInternalDrive(state.drives)
  const [selectedDriveId, setSelectedDriveId] = useState(
    () => internal?.id ?? state.drives[0]?.id ?? '',
  )

  const effectiveDriveId = state.drives.some(
    (drive) => drive.id === selectedDriveId,
  )
    ? selectedDriveId
    : (internal?.id ?? state.drives[0]?.id ?? '')

  const selectedDrive = getDriveById(state.drives, effectiveDriveId)

  const breakdown = calculateBreakdown(state, effectiveDriveId || undefined)
  const allBreakdowns = calculateAllBreakdowns(state)

  useEffect(() => {
    try {
      localStorage.setItem(FOCUS_STORAGE_KEY, focusMode ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [focusMode])

  const library = (
    <GameLibrary
      games={state.games}
      drives={state.drives}
      sources={state.sources}
      defaultDriveId={effectiveDriveId || undefined}
      onAdd={addGame}
      onUpdate={updateGame}
      onToggleCounted={setGameCounted}
      onSetCounted={setGamesCounted}
      onSetDrive={setGameDrive}
      onSetGamesDrive={setGamesDrive}
      onSetSource={setGameSource}
      onSetGamesSource={setGamesSource}
      onAddSource={addSource}
      onRemoveSource={removeSource}
      onArchive={(id) => setGameArchived(id, true)}
      onUnarchive={(id) => setGameArchived(id, false)}
      onArchiveMany={(ids) => setGamesArchived(ids, true)}
      onRemove={removeGame}
      onClear={clearGames}
      onClearArchived={clearArchivedGames}
      hideForm={focusMode}
      fillViewport={focusMode}
    />
  )

  const hint = (
    <div
      className={`hint ${breakdown.isOverCapacity ? 'hint--warn' : ''} ${focusMode ? 'hint--compact' : ''}`}
      role="status"
    >
      {breakdown.isOverCapacity ? (
        <p>
          {breakdown.driveName} de {formatSize(breakdown.advertisedGb)} (efetivo{' '}
          {formatSize(breakdown.effectiveCapacityGb)}) não basta. Recomendado:{' '}
          <strong>{formatSize(breakdown.recommendedCapacityGb)}</strong>.
        </p>
      ) : (
        <p>
          Cabe com folga em {breakdown.driveName}. Se for comprar outro,{' '}
          <strong>{formatSize(breakdown.recommendedCapacityGb)}</strong> cobre
          o que está neste disco.
        </p>
      )}
    </div>
  )

  return (
    <div className={focusMode ? 'app app--focus' : 'app'}>
      <div className="app__glow" aria-hidden="true" />
      <div className="app__grid" aria-hidden="true" />

      {focusMode ? (
        <>
          <header className="focus-bar">
            <p className="focus-bar__brand">Storage Calculator</p>
            <button
              type="button"
              className="mode-toggle is-active"
              onClick={() => {
                setAddOpen(false)
                setFocusMode(false)
              }}
              aria-pressed="true"
            >
              Sair do modo foco
            </button>
          </header>

          <main className="focus-layout">
            <aside className="panel panel--focus-stats">
              <DriveManager
                compact
                drives={state.drives}
                breakdowns={allBreakdowns}
                selectedDriveId={effectiveDriveId}
                onSelect={setSelectedDriveId}
                onAdd={addDrive}
                onUpdate={updateDrive}
                onSetInternal={setInternalDrive}
                onRemove={removeDrive}
              />
              <DiskGauge breakdown={breakdown} compact />
              {selectedDrive ? (
                <CollapsibleSection
                  key={`cap-${selectedDrive.id}`}
                  title="Capacidade do SSD"
                  storageKey="storage-calculator:focus-capacity-open"
                  defaultOpen={false}
                  summary={`${formatSize(selectedDrive.capacityGb)} → ${formatSize(breakdown.effectiveCapacityGb)}`}
                >
                  <div className="focus-capacity-stack">
                    <CapacitySetup
                      compact
                      hideCategories
                      drive={selectedDrive}
                      updateBufferPercent={state.updateBufferPercent}
                      useBinaryConversion={state.useBinaryConversion}
                      ssdOverheadPercent={state.ssdOverheadPercent}
                      osCapacityGb={breakdown.osCapacityGb}
                      effectiveCapacityGb={breakdown.effectiveCapacityGb}
                      binaryLossGb={breakdown.binaryLossGb}
                      ssdOverheadGb={breakdown.ssdOverheadGb}
                      usedGb={breakdown.usedGb}
                      freeGb={breakdown.freeGb}
                      onCapacityChange={(gb) =>
                        updateDrive(selectedDrive.id, { capacityGb: gb })
                      }
                      onBufferChange={setUpdateBufferPercent}
                      onUseBinaryConversionChange={setUseBinaryConversion}
                      onSsdOverheadChange={setSsdOverheadPercent}
                    />
                    <FreeCalibration
                      compact
                      modeledFreeGb={breakdown.modeledFreeGb}
                      calibrationOffsetGb={selectedDrive.calibrationOffsetGb}
                      onApply={(realFreeGb) => {
                        const offset = breakdown.modeledFreeGb - realFreeGb
                        updateDrive(selectedDrive.id, {
                          calibrationOffsetGb: offset,
                        })
                      }}
                      onClear={() =>
                        updateDrive(selectedDrive.id, {
                          calibrationOffsetGb: null,
                        })
                      }
                    />
                  </div>
                </CollapsibleSection>
              ) : null}
              {selectedDrive ? (
                <CollapsibleSection
                  key={`cat-${selectedDrive.id}`}
                  title="Uso fora dos jogos"
                  storageKey="storage-calculator:focus-categories-open"
                  defaultOpen={false}
                  summary={
                    state.categories.filter(
                      (category) => category.driveId === selectedDrive.id,
                    ).length > 0
                      ? `${
                          state.categories.filter(
                            (category) =>
                              category.driveId === selectedDrive.id,
                          ).length
                        } categorias · ${formatSize(breakdown.reservedGb)}`
                      : 'Nenhuma categoria'
                  }
                >
                  <SpaceCategories
                    compact
                    driveId={selectedDrive.id}
                    driveName={selectedDrive.name}
                    categories={state.categories}
                    onAdd={addCategory}
                    onUpdate={updateCategory}
                    onRemove={removeCategory}
                  />
                </CollapsibleSection>
              ) : null}
              {hint}
            </aside>

            <section className="panel panel--focus-library">{library}</section>
          </main>

          <button
            type="button"
            className="fab"
            onClick={() => setAddOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={addOpen}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <path
                d="M11 4v14M4 11h14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
            <span>Adicionar jogo</span>
          </button>

          <AddGameModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            sources={state.sources}
            onAdd={(name, sizeGb, sourceId) =>
              addGame(name, sizeGb, effectiveDriveId, sourceId)
            }
            onAddSource={addSource}
          />
        </>
      ) : (
        <>
          <header className="hero">
            <p className="hero__brand">Storage Calculator</p>
            <h1>Quanto SSD você precisa para a sua biblioteca?</h1>
            <p className="hero__lead">
              Organize o SSD interno do Ally e os externos de backup. Mova cada
              jogo para o disco certo e veja se cabe — antes de transferir.
            </p>
            <button
              type="button"
              className="mode-toggle"
              onClick={() => setFocusMode(true)}
              aria-pressed="false"
            >
              Entrar no modo foco
            </button>
          </header>

          <main className="layout">
            <aside className="panel panel--summary">
              <DiskGauge breakdown={breakdown} />
              {hint}
            </aside>

            <section className="panel panel--workspace">
              <DriveManager
                drives={state.drives}
                breakdowns={allBreakdowns}
                selectedDriveId={effectiveDriveId}
                onSelect={setSelectedDriveId}
                onAdd={(name, capacityGb) => {
                  const id = addDrive(name, capacityGb)
                  setSelectedDriveId(id)
                }}
                onUpdate={updateDrive}
                onSetInternal={(id) => {
                  setInternalDrive(id)
                  setSelectedDriveId(id)
                }}
                onRemove={(id) => {
                  const next = state.drives.find((drive) => drive.id !== id)
                  removeDrive(id)
                  if (selectedDriveId === id) {
                    setSelectedDriveId(next?.id ?? '')
                  }
                }}
              />

              {selectedDrive ? (
                <>
                  <CapacitySetup
                    drive={selectedDrive}
                    categories={state.categories}
                    updateBufferPercent={state.updateBufferPercent}
                    useBinaryConversion={state.useBinaryConversion}
                    ssdOverheadPercent={state.ssdOverheadPercent}
                    osCapacityGb={breakdown.osCapacityGb}
                    effectiveCapacityGb={breakdown.effectiveCapacityGb}
                    binaryLossGb={breakdown.binaryLossGb}
                    ssdOverheadGb={breakdown.ssdOverheadGb}
                    usedGb={breakdown.usedGb}
                    freeGb={breakdown.freeGb}
                    onCapacityChange={(gb) =>
                      updateDrive(selectedDrive.id, { capacityGb: gb })
                    }
                    onBufferChange={setUpdateBufferPercent}
                    onUseBinaryConversionChange={setUseBinaryConversion}
                    onSsdOverheadChange={setSsdOverheadPercent}
                    onAddCategory={addCategory}
                    onUpdateCategory={updateCategory}
                    onRemoveCategory={removeCategory}
                  />
                  <FreeCalibration
                    modeledFreeGb={breakdown.modeledFreeGb}
                    calibrationOffsetGb={selectedDrive.calibrationOffsetGb}
                    onApply={(realFreeGb) => {
                      const offset = breakdown.modeledFreeGb - realFreeGb
                      updateDrive(selectedDrive.id, {
                        calibrationOffsetGb: offset,
                      })
                    }}
                    onClear={() =>
                      updateDrive(selectedDrive.id, {
                        calibrationOffsetGb: null,
                      })
                    }
                  />
                </>
              ) : null}
            </section>

            <section className="panel panel--library">{library}</section>
          </main>

          <footer className="footer">
            <p>
              Capacidade anunciada em GB decimal (loja). O cálculo usa a
              conversão para o SO (base 1024) e overhead do SSD. Jogos entram
              por origem (Steam, emuladores…) e categorias manuais por disco.
              Tudo fica salvo neste navegador.
            </p>
          </footer>
        </>
      )}
    </div>
  )
}

export default App
