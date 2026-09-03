import { useEffect, useState } from 'react'
import {
  createDefaultCategories,
  createDefaultDrives,
  createDefaultSources,
  DEFAULT_STATE,
  DEFAULT_STEAM_SOURCE_ID,
  getInternalDrive,
  type Drive,
  type Game,
  type GameSource,
  type LibraryState,
  type SpaceCategory,
} from '../types'
import { createId } from '../utils/format'

const STORAGE_KEY = 'storage-calculator:library-v1'

function readNonNegative(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}

function normalizeDrive(value: unknown): Drive | null {
  if (!value || typeof value !== 'object') return null
  const drive = value as Partial<Drive> & { calibratedFreeGb?: number }
  if (
    typeof drive.id !== 'string' ||
    typeof drive.name !== 'string' ||
    typeof drive.capacityGb !== 'number' ||
    !Number.isFinite(drive.capacityGb) ||
    drive.capacityGb <= 0
  ) {
    return null
  }

  const calibrationOffsetGb =
    typeof drive.calibrationOffsetGb === 'number' &&
    Number.isFinite(drive.calibrationOffsetGb)
      ? drive.calibrationOffsetGb
      : null

  return {
    id: drive.id,
    name: drive.name.trim() || 'SSD',
    capacityGb: drive.capacityGb,
    isInternal: Boolean(drive.isInternal),
    calibrationOffsetGb,
  }
}

function normalizeCategory(
  value: unknown,
  fallbackDriveId: string,
): SpaceCategory | null {
  if (!value || typeof value !== 'object') return null
  const category = value as Partial<SpaceCategory>
  if (
    typeof category.id !== 'string' ||
    typeof category.name !== 'string' ||
    typeof category.sizeGb !== 'number' ||
    !Number.isFinite(category.sizeGb) ||
    category.sizeGb < 0
  ) {
    return null
  }

  return {
    id: category.id,
    name: category.name.trim() || 'Categoria',
    sizeGb: category.sizeGb,
    driveId:
      typeof category.driveId === 'string' && category.driveId
        ? category.driveId
        : fallbackDriveId,
  }
}

function normalizeSource(value: unknown): GameSource | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Partial<GameSource>
  if (typeof source.id !== 'string' || typeof source.name !== 'string') {
    return null
  }
  return {
    id: source.id,
    name: source.name.trim() || 'Origem',
  }
}

function normalizeGame(
  value: unknown,
  fallbackDriveId: string,
  fallbackSourceId: string,
): Game | null {
  if (!value || typeof value !== 'object') return null
  const game = value as Partial<Game>
  if (
    typeof game.id !== 'string' ||
    typeof game.name !== 'string' ||
    typeof game.sizeGb !== 'number' ||
    !Number.isFinite(game.sizeGb) ||
    game.sizeGb < 0 ||
    typeof game.createdAt !== 'number'
  ) {
    return null
  }

  return {
    id: game.id,
    name: game.name,
    sizeGb: game.sizeGb,
    counted: typeof game.counted === 'boolean' ? game.counted : true,
    archived: typeof game.archived === 'boolean' ? game.archived : false,
    driveId:
      typeof game.driveId === 'string' && game.driveId
        ? game.driveId
        : fallbackDriveId,
    sourceId:
      typeof game.sourceId === 'string' && game.sourceId
        ? game.sourceId
        : fallbackSourceId,
    createdAt: game.createdAt,
  }
}

function ensureInternalDrive(drives: Drive[]): Drive[] {
  if (drives.length === 0) return createDefaultDrives()

  const internalCount = drives.filter((drive) => drive.isInternal).length
  if (internalCount === 1) return drives

  if (internalCount === 0) {
    return drives.map((drive, index) =>
      index === 0
        ? { ...drive, isInternal: true }
        : { ...drive, isInternal: false },
    )
  }

  let kept = false
  return drives.map((drive) => {
    if (!drive.isInternal) return drive
    if (!kept) {
      kept = true
      return drive
    }
    return { ...drive, isInternal: false }
  })
}

function migrateCategories(
  parsed: Partial<LibraryState> & {
    systemReservedGb?: number
    programsReservedGb?: number
    otherReservedGb?: number
  },
  drives: Drive[],
  internalId: string,
): SpaceCategory[] {
  if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
    return parsed.categories
      .map((category) => normalizeCategory(category, internalId))
      .filter((category): category is SpaceCategory => category !== null)
      .map((category) =>
        drives.some((drive) => drive.id === category.driveId)
          ? category
          : { ...category, driveId: internalId },
      )
  }

  return [
    {
      id: createId(),
      name: 'Sistema',
      sizeGb: readNonNegative(parsed.systemReservedGb, 40),
      driveId: internalId,
    },
    {
      id: createId(),
      name: 'Programas',
      sizeGb: readNonNegative(parsed.programsReservedGb, 30),
      driveId: internalId,
    },
    {
      id: createId(),
      name: 'Outros',
      sizeGb: readNonNegative(parsed.otherReservedGb, 0),
      driveId: internalId,
    },
  ]
}

function loadState(): LibraryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<LibraryState> & {
      capacityGb?: number
      systemReservedGb?: number
      programsReservedGb?: number
      otherReservedGb?: number
    }

    let drives = Array.isArray(parsed.drives)
      ? parsed.drives
          .map(normalizeDrive)
          .filter((drive): drive is Drive => drive !== null)
      : []

    if (drives.length === 0) {
      const legacyCapacity =
        typeof parsed.capacityGb === 'number' && parsed.capacityGb > 0
          ? parsed.capacityGb
          : DEFAULT_STATE.drives[0].capacityGb
      drives = createDefaultDrives(legacyCapacity)
    }

    drives = ensureInternalDrive(drives)
    const internalId = getInternalDrive(drives)?.id ?? drives[0].id

    let sources = Array.isArray(parsed.sources)
      ? parsed.sources
          .map(normalizeSource)
          .filter((source): source is GameSource => source !== null)
      : []
    if (sources.length === 0) {
      sources = createDefaultSources()
    } else {
      const knownIds = new Set(sources.map((source) => source.id))
      for (const preset of createDefaultSources()) {
        if (!knownIds.has(preset.id)) sources.push(preset)
      }
    }

    const fallbackSourceId =
      sources.find((source) => source.id === DEFAULT_STEAM_SOURCE_ID)?.id ??
      sources[0].id

    const games = Array.isArray(parsed.games)
      ? parsed.games
          .map((game) => normalizeGame(game, internalId, fallbackSourceId))
          .filter((game): game is Game => game !== null)
          .map((game) => ({
            ...game,
            driveId: drives.some((drive) => drive.id === game.driveId)
              ? game.driveId
              : internalId,
            sourceId: sources.some((source) => source.id === game.sourceId)
              ? game.sourceId
              : fallbackSourceId,
          }))
      : []

    return {
      drives,
      sources,
      categories: migrateCategories(parsed, drives, internalId),
      updateBufferPercent: readNonNegative(
        parsed.updateBufferPercent,
        DEFAULT_STATE.updateBufferPercent,
      ),
      useBinaryConversion:
        typeof parsed.useBinaryConversion === 'boolean'
          ? parsed.useBinaryConversion
          : DEFAULT_STATE.useBinaryConversion,
      ssdOverheadPercent: readNonNegative(
        parsed.ssdOverheadPercent,
        DEFAULT_STATE.ssdOverheadPercent,
      ),
      games,
    }
  } catch {
    return DEFAULT_STATE
  }
}

export function useLibrary() {
  const [state, setState] = useState<LibraryState>(() => loadState())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  function setUpdateBufferPercent(updateBufferPercent: number) {
    setState((prev) => ({ ...prev, updateBufferPercent }))
  }

  function setUseBinaryConversion(useBinaryConversion: boolean) {
    setState((prev) => ({ ...prev, useBinaryConversion }))
  }

  function setSsdOverheadPercent(ssdOverheadPercent: number) {
    setState((prev) => ({
      ...prev,
      ssdOverheadPercent: Math.min(ssdOverheadPercent, 100),
    }))
  }

  function addDrive(name: string, capacityGb: number) {
    const drive: Drive = {
      id: createId(),
      name: name.trim() || 'SSD externo',
      capacityGb,
      isInternal: false,
    }
    setState((prev) => ({ ...prev, drives: [...prev.drives, drive] }))
    return drive.id
  }

  function updateDrive(
    id: string,
    patch: Partial<
      Pick<Drive, 'name' | 'capacityGb' | 'calibrationOffsetGb'>
    >,
  ) {
    setState((prev) => ({
      ...prev,
      drives: prev.drives.map((drive) =>
        drive.id === id
          ? {
              ...drive,
              name:
                typeof patch.name === 'string'
                  ? patch.name.trim() || drive.name
                  : drive.name,
              capacityGb:
                typeof patch.capacityGb === 'number' && patch.capacityGb > 0
                  ? patch.capacityGb
                  : drive.capacityGb,
              calibrationOffsetGb:
                patch.calibrationOffsetGb === null
                  ? null
                  : typeof patch.calibrationOffsetGb === 'number' &&
                      Number.isFinite(patch.calibrationOffsetGb)
                    ? patch.calibrationOffsetGb
                    : drive.calibrationOffsetGb,
            }
          : drive,
      ),
    }))
  }

  function setInternalDrive(id: string) {
    setState((prev) => ({
      ...prev,
      drives: prev.drives.map((drive) => ({
        ...drive,
        isInternal: drive.id === id,
      })),
    }))
  }

  function removeDrive(id: string) {
    setState((prev) => {
      if (prev.drives.length <= 1) return prev
      const target = prev.drives.find((drive) => drive.id === id)
      if (!target) return prev

      const remaining = prev.drives.filter((drive) => drive.id !== id)
      const nextDrives = target.isInternal
        ? ensureInternalDrive(remaining)
        : remaining
      const fallbackId = getInternalDrive(nextDrives)?.id ?? nextDrives[0].id

      return {
        ...prev,
        drives: nextDrives,
        categories: prev.categories
          .filter((category) => category.driveId !== id)
          .concat(
            prev.categories.some((category) => category.driveId === fallbackId)
              ? []
              : createDefaultCategories(fallbackId),
          ),
        games: prev.games.map((game) =>
          game.driveId === id ? { ...game, driveId: fallbackId } : game,
        ),
      }
    })
  }

  function addCategory(driveId: string, name: string, sizeGb: number) {
    setState((prev) => {
      if (!prev.drives.some((drive) => drive.id === driveId)) return prev
      const category: SpaceCategory = {
        id: createId(),
        name: name.trim() || 'Categoria',
        sizeGb,
        driveId,
      }
      return { ...prev, categories: [...prev.categories, category] }
    })
  }

  function updateCategory(
    id: string,
    patch: Partial<Pick<SpaceCategory, 'name' | 'sizeGb'>>,
  ) {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((category) =>
        category.id === id
          ? {
              ...category,
              name:
                typeof patch.name === 'string'
                  ? patch.name.trim() || category.name
                  : category.name,
              sizeGb:
                typeof patch.sizeGb === 'number' &&
                Number.isFinite(patch.sizeGb) &&
                patch.sizeGb >= 0
                  ? patch.sizeGb
                  : category.sizeGb,
            }
          : category,
      ),
    }))
  }

  function removeCategory(id: string) {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.filter((category) => category.id !== id),
    }))
  }

  function addSource(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return null
    let createdId: string | null = null
    setState((prev) => {
      const existing = prev.sources.find(
        (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
      )
      if (existing) {
        createdId = existing.id
        return prev
      }
      const source: GameSource = { id: createId(), name: trimmed }
      createdId = source.id
      return { ...prev, sources: [...prev.sources, source] }
    })
    return createdId
  }

  function updateSource(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setState((prev) => ({
      ...prev,
      sources: prev.sources.map((source) =>
        source.id === id ? { ...source, name: trimmed } : source,
      ),
    }))
  }

  function removeSource(id: string) {
    setState((prev) => {
      if (prev.sources.length <= 1) return prev
      const remaining = prev.sources.filter((source) => source.id !== id)
      if (remaining.length === prev.sources.length) return prev
      const fallbackId =
        remaining.find((source) => source.id === DEFAULT_STEAM_SOURCE_ID)?.id ??
        remaining[0].id
      return {
        ...prev,
        sources: remaining,
        games: prev.games.map((game) =>
          game.sourceId === id ? { ...game, sourceId: fallbackId } : game,
        ),
      }
    })
  }

  function addGame(
    name: string,
    sizeGb: number,
    driveId?: string,
    sourceId?: string,
  ) {
    setState((prev) => {
      const fallback =
        getInternalDrive(prev.drives)?.id ?? prev.drives[0]?.id ?? createId()
      const resolvedDriveId =
        driveId && prev.drives.some((drive) => drive.id === driveId)
          ? driveId
          : fallback
      const fallbackSource =
        prev.sources.find((source) => source.id === DEFAULT_STEAM_SOURCE_ID)
          ?.id ?? prev.sources[0]?.id ?? DEFAULT_STEAM_SOURCE_ID
      const resolvedSourceId =
        sourceId && prev.sources.some((source) => source.id === sourceId)
          ? sourceId
          : fallbackSource

      const game: Game = {
        id: createId(),
        name: name.trim(),
        sizeGb,
        counted: true,
        archived: false,
        driveId: resolvedDriveId,
        sourceId: resolvedSourceId,
        createdAt: Date.now(),
      }

      return { ...prev, games: [game, ...prev.games] }
    })
  }

  function updateGame(
    id: string,
    name: string,
    sizeGb: number,
    sourceId?: string,
  ) {
    setState((prev) => ({
      ...prev,
      games: prev.games.map((game) => {
        if (game.id !== id) return game
        const nextSource =
          sourceId && prev.sources.some((source) => source.id === sourceId)
            ? sourceId
            : game.sourceId
        return {
          ...game,
          name: name.trim(),
          sizeGb,
          sourceId: nextSource,
        }
      }),
    }))
  }

  function setGameSource(id: string, sourceId: string) {
    setState((prev) => {
      if (!prev.sources.some((source) => source.id === sourceId)) return prev
      return {
        ...prev,
        games: prev.games.map((game) =>
          game.id === id ? { ...game, sourceId } : game,
        ),
      }
    })
  }

  function setGamesSource(ids: string[], sourceId: string) {
    setState((prev) => {
      if (!prev.sources.some((source) => source.id === sourceId)) return prev
      const idSet = new Set(ids)
      return {
        ...prev,
        games: prev.games.map((game) =>
          idSet.has(game.id) ? { ...game, sourceId } : game,
        ),
      }
    })
  }

  function setGameDrive(id: string, driveId: string) {
    setState((prev) => {
      if (!prev.drives.some((drive) => drive.id === driveId)) return prev
      return {
        ...prev,
        games: prev.games.map((game) =>
          game.id === id ? { ...game, driveId } : game,
        ),
      }
    })
  }

  function setGamesDrive(ids: string[], driveId: string) {
    setState((prev) => {
      if (!prev.drives.some((drive) => drive.id === driveId)) return prev
      const idSet = new Set(ids)
      return {
        ...prev,
        games: prev.games.map((game) =>
          idSet.has(game.id) ? { ...game, driveId } : game,
        ),
      }
    })
  }

  function setGameCounted(id: string, counted: boolean) {
    setState((prev) => ({
      ...prev,
      games: prev.games.map((game) =>
        game.id === id ? { ...game, counted } : game,
      ),
    }))
  }

  function setAllGamesCounted(counted: boolean) {
    setState((prev) => ({
      ...prev,
      games: prev.games.map((game) =>
        game.archived || game.counted === counted
          ? game
          : { ...game, counted },
      ),
    }))
  }

  function setGamesCounted(ids: string[], counted: boolean) {
    const idSet = new Set(ids)
    setState((prev) => ({
      ...prev,
      games: prev.games.map((game) =>
        !game.archived && idSet.has(game.id) && game.counted !== counted
          ? { ...game, counted }
          : game,
      ),
    }))
  }

  function setGameArchived(id: string, archived: boolean) {
    setState((prev) => ({
      ...prev,
      games: prev.games.map((game) =>
        game.id === id
          ? {
              ...game,
              archived,
              counted: archived ? false : game.counted,
            }
          : game,
      ),
    }))
  }

  function setGamesArchived(ids: string[], archived: boolean) {
    const idSet = new Set(ids)
    setState((prev) => ({
      ...prev,
      games: prev.games.map((game) =>
        idSet.has(game.id)
          ? {
              ...game,
              archived,
              counted: archived ? false : game.counted,
            }
          : game,
      ),
    }))
  }

  function removeGame(id: string) {
    setState((prev) => ({
      ...prev,
      games: prev.games.filter((game) => game.id !== id),
    }))
  }

  function clearGames() {
    setState((prev) => ({
      ...prev,
      games: prev.games.filter((game) => game.archived),
    }))
  }

  function clearArchivedGames() {
    setState((prev) => ({
      ...prev,
      games: prev.games.filter((game) => !game.archived),
    }))
  }

  return {
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
    updateSource,
    removeSource,
    addGame,
    updateGame,
    setGameSource,
    setGamesSource,
    setGameDrive,
    setGamesDrive,
    setGameCounted,
    setAllGamesCounted,
    setGamesCounted,
    setGameArchived,
    setGamesArchived,
    removeGame,
    clearGames,
    clearArchivedGames,
  }
}
