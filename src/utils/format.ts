import {
  DECIMAL_TO_BINARY,
  categoryColorAt,
  gameSourceColorAt,
  getDriveById,
  getInternalDrive,
  getSourceById,
  type Drive,
  type LibraryState,
  type SizeUnit,
} from '../types'

export function formatSize(gb: number): string {
  if (!Number.isFinite(gb) || gb === 0) return '0 GB'
  const abs = Math.abs(gb)
  if (abs >= 1000) {
    const tb = gb / 1000
    return `${trimNumber(tb)} TB`
  }
  if (abs < 1) {
    const mb = gb * 1000
    return `${trimNumber(mb)} MB`
  }
  return `${trimNumber(gb)} GB`
}

export function trimNumber(value: number): string {
  return Number(value.toFixed(2)).toString().replace('.', ',')
}

export function parseSizeInput(raw: string, unit: SizeUnit): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!normalized) return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) return null
  if (unit === 'TB') return value * 1000
  if (unit === 'MB') return value / 1000
  return value
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function toOsCapacityGb(
  advertisedGb: number,
  useBinaryConversion: boolean,
): number {
  return useBinaryConversion ? advertisedGb * DECIMAL_TO_BINARY : advertisedGb
}

export function toEffectiveCapacityGb(
  advertisedGb: number,
  useBinaryConversion: boolean,
  ssdOverheadPercent: number,
): number {
  const osCapacityGb = toOsCapacityGb(advertisedGb, useBinaryConversion)
  const overheadGb = osCapacityGb * (Math.min(ssdOverheadPercent, 100) / 100)
  return Math.max(osCapacityGb - overheadGb, 0)
}

export interface BreakdownCategory {
  id: string
  name: string
  sizeGb: number
  color: string
  gameCount?: number
}

export interface StorageBreakdown {
  driveId: string
  driveName: string
  isInternal: boolean
  gamesGb: number
  wishlistGb: number
  wishlistCount: number
  gameSources: BreakdownCategory[]
  bufferGb: number
  reservedGb: number
  categories: BreakdownCategory[]
  advertisedGb: number
  osCapacityGb: number
  binaryLossGb: number
  ssdOverheadGb: number
  effectiveCapacityGb: number
  /** Usage before calibration offset. */
  modeledUsedGb: number
  /** Free space before calibration offset. */
  modeledFreeGb: number
  /** Fixed offset shown as "Calibragem" in the legend. */
  calibrationOffsetGb: number
  isCalibrated: boolean
  usedGb: number
  freeGb: number
  usableGb: number
  usedPercent: number
  isOverCapacity: boolean
  recommendedCapacityGb: number
  gameCount: number
}

export function calculateDriveBreakdown(
  state: LibraryState,
  drive: Drive,
): StorageBreakdown {
  const driveGames = state.games.filter(
    (game) => !game.archived && game.counted && game.driveId === drive.id,
  )
  const wishlistGames = state.games.filter(
    (game) => !game.archived && game.wishlist && game.driveId === drive.id,
  )
  const gamesGb = driveGames.reduce((sum, game) => sum + game.sizeGb, 0)
  const wishlistGb = wishlistGames.reduce((sum, game) => sum + game.sizeGb, 0)
  const bufferGb = gamesGb * (state.updateBufferPercent / 100)

  const totals = new Map<string, { sizeGb: number; count: number }>()
  for (const game of driveGames) {
    const key = game.sourceId
    const current = totals.get(key) ?? { sizeGb: 0, count: 0 }
    current.sizeGb += game.sizeGb
    current.count += 1
    totals.set(key, current)
  }

  const gameSources: BreakdownCategory[] = []
  let colorIndex = 0
  for (const source of state.sources) {
    const entry = totals.get(source.id)
    if (!entry || entry.sizeGb <= 0) continue
    gameSources.push({
      id: source.id,
      name: source.name,
      sizeGb: entry.sizeGb,
      color: gameSourceColorAt(colorIndex),
      gameCount: entry.count,
    })
    colorIndex += 1
    totals.delete(source.id)
  }
  for (const [sourceId, entry] of totals) {
    if (entry.sizeGb <= 0) continue
    const known = getSourceById(state.sources, sourceId)
    gameSources.push({
      id: sourceId,
      name: known?.name ?? 'Sem origem',
      sizeGb: entry.sizeGb,
      color: gameSourceColorAt(colorIndex),
      gameCount: entry.count,
    })
    colorIndex += 1
  }

  const driveCategories = state.categories.filter(
    (category) => category.driveId === drive.id,
  )
  const categories: BreakdownCategory[] = driveCategories.map(
    (category, index) => ({
      id: category.id,
      name: category.name,
      sizeGb: category.sizeGb,
      color: categoryColorAt(index),
    }),
  )
  const reservedGb = categories.reduce((sum, item) => sum + item.sizeGb, 0)
  const modeledUsedGb = gamesGb + bufferGb + wishlistGb + reservedGb

  const advertisedGb = drive.capacityGb
  const osCapacityGb = toOsCapacityGb(advertisedGb, state.useBinaryConversion)
  const binaryLossGb = Math.max(advertisedGb - osCapacityGb, 0)
  const ssdOverheadGb =
    osCapacityGb * (Math.min(state.ssdOverheadPercent, 100) / 100)
  const effectiveCapacityGb = Math.max(osCapacityGb - ssdOverheadGb, 0)

  const usableGb = Math.max(effectiveCapacityGb - reservedGb, 0)
  const modeledFreeGb = effectiveCapacityGb - modeledUsedGb

  const isCalibrated =
    typeof drive.calibrationOffsetGb === 'number' &&
    Number.isFinite(drive.calibrationOffsetGb)
  const calibrationOffsetGb = isCalibrated
    ? (drive.calibrationOffsetGb as number)
    : 0

  const usedGb = modeledUsedGb + calibrationOffsetGb
  const freeGb = effectiveCapacityGb - usedGb

  const usedPercent =
    effectiveCapacityGb > 0
      ? Math.min(Math.max((usedGb / effectiveCapacityGb) * 100, 0), 999)
      : 0

  const recommendedCapacityGb = recommendCapacity(
    Math.max(usedGb, modeledUsedGb),
    state.useBinaryConversion,
    state.ssdOverheadPercent,
  )

  return {
    driveId: drive.id,
    driveName: drive.name,
    isInternal: drive.isInternal,
    gamesGb,
    wishlistGb,
    wishlistCount: wishlistGames.length,
    gameSources,
    bufferGb,
    reservedGb,
    categories,
    advertisedGb,
    osCapacityGb,
    binaryLossGb,
    ssdOverheadGb,
    effectiveCapacityGb,
    modeledUsedGb,
    modeledFreeGb,
    calibrationOffsetGb,
    isCalibrated,
    usedGb,
    freeGb,
    usableGb,
    usedPercent,
    isOverCapacity: freeGb < 0,
    recommendedCapacityGb,
    gameCount: driveGames.length,
  }
}

export function calculateBreakdown(
  state: LibraryState,
  driveId?: string,
): StorageBreakdown {
  const drive =
    (driveId ? getDriveById(state.drives, driveId) : undefined) ??
    getInternalDrive(state.drives) ??
    state.drives[0]

  if (!drive) {
    return calculateDriveBreakdown(state, {
      id: 'missing',
      name: 'SSD',
      capacityGb: 0,
      isInternal: true,
    })
  }

  return calculateDriveBreakdown(state, drive)
}

export function calculateAllBreakdowns(
  state: LibraryState,
): StorageBreakdown[] {
  return state.drives.map((drive) => calculateDriveBreakdown(state, drive))
}

function recommendCapacity(
  neededEffectiveGb: number,
  useBinaryConversion: boolean,
  ssdOverheadPercent: number,
): number {
  const target = neededEffectiveGb * 1.05
  const common = [256, 512, 1000, 2000, 4000, 8000]

  const fits = (advertisedGb: number) =>
    toEffectiveCapacityGb(
      advertisedGb,
      useBinaryConversion,
      ssdOverheadPercent,
    ) >= target

  const found = common.find(fits)
  if (found) return found

  const factor =
    (useBinaryConversion ? DECIMAL_TO_BINARY : 1) *
    (1 - Math.min(ssdOverheadPercent, 100) / 100)

  if (factor <= 0) return Math.ceil(target / 1000) * 1000
  return Math.ceil(target / factor / 1000) * 1000
}
