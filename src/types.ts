export type SizeUnit = 'MB' | 'GB' | 'TB'

export interface Drive {
  id: string
  name: string
  capacityGb: number
  isInternal: boolean
  /**
   * Fixed usage adjustment from real-SSD calibration.
   * Added to modeled usage so free space keeps recalculating with games.
   * Positive = usage that was missing from the model.
   */
  calibrationOffsetGb?: number | null
}

/** Origin of a game: Steam, emulator, etc. */
export interface GameSource {
  id: string
  name: string
}

export interface Game {
  id: string
  name: string
  sizeGb: number
  counted: boolean
  /** Planned install — counts toward the assigned drive, shown in purple. */
  wishlist: boolean
  archived: boolean
  driveId: string
  sourceId: string
  createdAt: number
}

/** Manual space usage entries (Sistema, Users, etc.) per drive. */
export interface SpaceCategory {
  id: string
  name: string
  sizeGb: number
  driveId: string
}

export interface LibraryState {
  drives: Drive[]
  sources: GameSource[]
  categories: SpaceCategory[]
  updateBufferPercent: number
  /** Convert marketing decimal GB to what the OS usually shows (base 1024). */
  useBinaryConversion: boolean
  /** Extra % reserved on top of OS capacity for SSD/FS overhead. */
  ssdOverheadPercent: number
  games: Game[]
}

export const DEFAULT_INTERNAL_DRIVE_ID = 'drive-internal'
export const DEFAULT_STEAM_SOURCE_ID = 'source-steam'

export const GAME_SOURCE_COLORS = [
  '#8cd650',
  '#3d9b7a',
  '#5f7f9b',
  '#b08a4a',
  '#7a6e9b',
  '#9b6e6e',
  '#4a7c8f',
  '#a67c52',
  '#6b8f71',
  '#5a8f8a',
] as const

export const WISHLIST_COLOR = '#8b6cc7'

export const CATEGORY_DOT_COLORS = [
  '#8aa396',
  '#5f7f9b',
  '#b08a4a',
  '#3d9b7a',
  '#7a6e9b',
  '#9b6e6e',
  '#6b8f71',
  '#4a7c8f',
  '#a67c52',
  '#5a8f8a',
] as const

export function createDefaultDrives(capacityGb = 2000): Drive[] {
  return [
    {
      id: DEFAULT_INTERNAL_DRIVE_ID,
      name: 'ROG Ally (interno)',
      capacityGb,
      isInternal: true,
    },
  ]
}

export function createDefaultSources(): GameSource[] {
  return [
    { id: DEFAULT_STEAM_SOURCE_ID, name: 'Steam' },
    { id: 'source-ps4', name: 'Emulador PS4' },
    { id: 'source-ps3', name: 'Emulador PS3' },
    { id: 'source-ps2', name: 'Emulador PS2' },
    { id: 'source-switch', name: 'Emulador Switch' },
    { id: 'source-other', name: 'Outros' },
  ]
}

export function createDefaultCategories(driveId: string): SpaceCategory[] {
  return [
    { id: `${driveId}-sistema`, name: 'Sistema', sizeGb: 40, driveId },
    { id: `${driveId}-programas`, name: 'Programas', sizeGb: 30, driveId },
    { id: `${driveId}-users`, name: 'Users', sizeGb: 0, driveId },
  ]
}

export const DEFAULT_STATE: LibraryState = {
  drives: createDefaultDrives(2000),
  sources: createDefaultSources(),
  categories: createDefaultCategories(DEFAULT_INTERNAL_DRIVE_ID),
  updateBufferPercent: 10,
  useBinaryConversion: true,
  ssdOverheadPercent: 7,
  games: [],
}

export const CAPACITY_PRESETS = [
  { label: '256 GB', valueGb: 256 },
  { label: '512 GB', valueGb: 512 },
  { label: '1 TB', valueGb: 1000 },
  { label: '2 TB', valueGb: 2000 },
  { label: '4 TB', valueGb: 4000 },
  { label: '8 TB', valueGb: 8000 },
] as const

/** Marketing decimal GB → approximate OS GiB (Windows "GB"). */
export const DECIMAL_TO_BINARY = 1000 / 1024

export function getInternalDrive(drives: Drive[]): Drive | undefined {
  return drives.find((drive) => drive.isInternal) ?? drives[0]
}

export function getDriveById(
  drives: Drive[],
  driveId: string,
): Drive | undefined {
  return drives.find((drive) => drive.id === driveId)
}

export function getSourceById(
  sources: GameSource[],
  sourceId: string,
): GameSource | undefined {
  return sources.find((source) => source.id === sourceId)
}

export function categoryColorAt(index: number): string {
  return CATEGORY_DOT_COLORS[index % CATEGORY_DOT_COLORS.length]
}

export function gameSourceColorAt(index: number): string {
  return GAME_SOURCE_COLORS[index % GAME_SOURCE_COLORS.length]
}
