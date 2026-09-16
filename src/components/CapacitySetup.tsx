import {
  STORAGE_TYPES,
  capacityPresetsFor,
  storageTypeLabel,
  type Drive,
  type SpaceCategory,
  type StorageType,
} from '../types'
import { formatSize, parseSizeInput } from '../utils/format'
import { SpaceCategories } from './SpaceCategories'
import './CapacitySetup.css'

interface CapacitySetupProps {
  drive: Drive
  categories?: SpaceCategory[]
  updateBufferPercent: number
  useBinaryConversion: boolean
  ssdOverheadPercent: number
  osCapacityGb: number
  effectiveCapacityGb: number
  binaryLossGb: number
  ssdOverheadGb: number
  usedGb?: number
  freeGb?: number
  onCapacityChange: (gb: number) => void
  onNameChange: (name: string) => void
  onTypeChange: (type: StorageType) => void
  onBufferChange: (percent: number) => void
  onUseBinaryConversionChange: (enabled: boolean) => void
  onSsdOverheadChange: (percent: number) => void
  onAddCategory?: (driveId: string, name: string, sizeGb: number) => void
  onUpdateCategory?: (
    id: string,
    patch: Partial<Pick<SpaceCategory, 'name' | 'sizeGb'>>,
  ) => void
  onRemoveCategory?: (id: string) => void
  compact?: boolean
  hideCategories?: boolean
}

export function CapacitySetup({
  drive,
  categories = [],
  updateBufferPercent,
  useBinaryConversion,
  ssdOverheadPercent,
  osCapacityGb,
  effectiveCapacityGb,
  binaryLossGb,
  ssdOverheadGb,
  usedGb,
  freeGb,
  onCapacityChange,
  onNameChange,
  onTypeChange,
  onBufferChange,
  onUseBinaryConversionChange,
  onSsdOverheadChange,
  onAddCategory,
  onUpdateCategory,
  onRemoveCategory,
  compact = false,
  hideCategories = false,
}: CapacitySetupProps) {
  const presets = capacityPresetsFor(drive.type)
  const typeLabel = storageTypeLabel(drive.type)
  const customCapacity = !presets.some(
    (preset) => preset.valueGb === drive.capacityGb,
  )
  const showCategories =
    !hideCategories &&
    onAddCategory &&
    onUpdateCategory &&
    onRemoveCategory

  return (
    <section className={compact ? 'capacity capacity--compact' : 'capacity'}>
      <div className="capacity__block">
        <h2>
          {compact
            ? `Capacidade do ${typeLabel}`
            : `Capacidade do ${typeLabel} · ${drive.name}`}
        </h2>
        {compact ? (
          <p className="capacity__note">
            Anunciado vs. o que o Windows mostra (ex.: 2 TB → ~1,8 TB).
          </p>
        ) : null}

        <label className="field">
          <span>Nome</span>
          <input
            type="text"
            defaultValue={drive.name}
            key={`${drive.id}-name-${drive.name}`}
            placeholder={
              drive.type === 'microsd' ? 'Ex.: MicroSD 512 GB' : 'Ex.: SSD interno'
            }
            autoComplete="off"
            onBlur={(e) => {
              const next = e.target.value.trim()
              if (next && next !== drive.name) onNameChange(next)
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.currentTarget.blur()
            }}
          />
        </label>

        <div className="capacity__presets" role="group" aria-label="Tipo">
          {STORAGE_TYPES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`chip ${drive.type === option.id ? 'is-active' : ''}`}
              onClick={() => onTypeChange(option.id)}
              aria-pressed={drive.type === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="capacity__presets" role="group" aria-label="Presets">
          {presets.map((preset) => (
            <button
              key={preset.valueGb}
              type="button"
              className={`chip ${drive.capacityGb === preset.valueGb ? 'is-active' : ''}`}
              onClick={() => onCapacityChange(preset.valueGb)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label className="field">
          <span>
            {compact
              ? 'GB anunciado (manual)'
              : 'Ou informe manualmente (GB anunciado)'}
          </span>
          <input
            type="text"
            inputMode="decimal"
            defaultValue={
              customCapacity
                ? String(drive.capacityGb).replace('.', ',')
                : String(drive.capacityGb)
            }
            key={`${drive.id}-cap-${drive.capacityGb}`}
            placeholder="Ex.: 2000"
            onBlur={(e) => {
              const parsed = parseSizeInput(e.target.value, 'GB')
              if (parsed !== null && parsed > 0) onCapacityChange(parsed)
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.currentTarget.blur()
            }}
          />
        </label>

        <div className="capacity__realism">
          <label className="toggle">
            <input
              type="checkbox"
              checked={useBinaryConversion}
              onChange={(e) => onUseBinaryConversionChange(e.target.checked)}
            />
            <span className="toggle__box" aria-hidden="true" />
            <span className="toggle__copy">
              {compact
                ? 'Conversão SO (base 1024)'
                : 'Converter para capacidade do SO (base 1024)'}
              <small>
                {compact
                  ? `2 TB loja ≈ ${formatSize(2000 * (1000 / 1024))} no Windows`
                  : `Ex.: 512 GB de loja ≈ ${formatSize(512 * (1000 / 1024))} no Windows`}
              </small>
            </span>
          </label>

          <label className="field">
            <span>Overhead do disco / FS (%)</span>
            <input
              type="text"
              inputMode="decimal"
              defaultValue={String(ssdOverheadPercent).replace('.', ',')}
              key={`oh-${drive.id}-${ssdOverheadPercent}`}
              onBlur={(e) => {
                const parsed = parseSizeInput(e.target.value, 'GB')
                if (parsed !== null) onSsdOverheadChange(Math.min(parsed, 100))
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.currentTarget.blur()
              }}
            />
          </label>

          <label className="field">
            <span>Folga p/ updates (%)</span>
            <input
              type="text"
              inputMode="decimal"
              defaultValue={String(updateBufferPercent).replace('.', ',')}
              key={`buf-${drive.id}-${updateBufferPercent}`}
              onBlur={(e) => {
                const parsed = parseSizeInput(e.target.value, 'GB')
                if (parsed !== null) onBufferChange(Math.min(parsed, 100))
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.currentTarget.blur()
              }}
            />
          </label>

          <ul className="capacity__facts">
            <li>
              No SO <strong>{formatSize(osCapacityGb)}</strong>
              {binaryLossGb > 0 ? (
                <em> (−{formatSize(binaryLossGb)} na conversão)</em>
              ) : null}
            </li>
            <li>
              Overhead <strong>{formatSize(ssdOverheadGb)}</strong>
              <em>
                {' '}
                ({String(ssdOverheadPercent).replace('.', ',')}% do SO)
              </em>
            </li>
            <li>
              Capacidade efetiva{' '}
              <strong>{formatSize(effectiveCapacityGb)}</strong>
              <em> — tamanho útil do disco</em>
            </li>
            {typeof usedGb === 'number' && typeof freeGb === 'number' ? (
              <>
                <li>
                  Em uso agora <strong>{formatSize(usedGb)}</strong>
                </li>
                <li>
                  {freeGb < 0 ? 'Faltando' : 'Livre agora'}{' '}
                  <strong>{formatSize(Math.abs(freeGb))}</strong>
                </li>
              </>
            ) : null}
          </ul>
        </div>
      </div>

      {!compact ? (
        <div className="capacity__block">
          <h2>Folga para updates</h2>
          <p className="capacity__note">
            Percentual extra sobre o tamanho dos jogos deste {typeLabel}{' '}
            (patches e downloads).
          </p>
          <label className="field">
            <span>Folga p/ updates (%)</span>
            <input
              type="text"
              inputMode="decimal"
              defaultValue={String(updateBufferPercent).replace('.', ',')}
              key={`buf-full-${drive.id}-${updateBufferPercent}`}
              onBlur={(e) => {
                const parsed = parseSizeInput(e.target.value, 'GB')
                if (parsed !== null) onBufferChange(Math.min(parsed, 100))
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.currentTarget.blur()
              }}
            />
          </label>
        </div>
      ) : null}

      {showCategories ? (
        <div className="capacity__block">
          <SpaceCategories
            driveId={drive.id}
            driveName={drive.name}
            categories={categories}
            onAdd={onAddCategory}
            onUpdate={onUpdateCategory}
            onRemove={onRemoveCategory}
          />
        </div>
      ) : null}
    </section>
  )
}
