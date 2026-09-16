import { useState, type FormEvent } from 'react'
import { formatSize, parseSizeInput } from '../utils/format'
import { TrashIcon } from './ActionIcons'
import './FreeCalibration.css'

interface FreeCalibrationProps {
  modeledFreeGb: number
  calibrationOffsetGb: number | null | undefined
  onApply: (realFreeGb: number) => void
  onClear: () => void
  compact?: boolean
}

export function FreeCalibration({
  modeledFreeGb,
  calibrationOffsetGb,
  onApply,
  onClear,
  compact = false,
}: FreeCalibrationProps) {
  const isCalibrated =
    typeof calibrationOffsetGb === 'number' && Number.isFinite(calibrationOffsetGb)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseSizeInput(value, 'GB')
    if (parsed === null) {
      setError('Informe o livre real em GB.')
      return
    }
    onApply(parsed)
    setValue('')
    setError('')
  }

  return (
    <section
      className={
        compact
          ? 'free-cal free-cal--compact'
          : 'free-cal'
      }
    >
      <div className="free-cal__head">
        <h3>Calibrar com SSD real</h3>
        <p>
          Digite o espaço livre que o Windows mostra. O app cria um item
          <strong> Calibragem </strong>
          no detalhamento com a diferença — e o livre continua recalculando
          quando você marca jogos.
        </p>
      </div>

      <form className="free-cal__form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Livre real (GB)</span>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Agora calculado: ${formatSize(modeledFreeGb)}`}
            autoComplete="off"
          />
        </label>
        <button type="submit" className="btn btn--primary">
          Aplicar
        </button>
      </form>

      {error ? <p className="free-cal__error">{error}</p> : null}

      {isCalibrated ? (
        <div className="free-cal__status">
          <p>
            Calibragem ativa:{' '}
            <strong>
              {(calibrationOffsetGb as number) >= 0 ? '+' : '−'}
              {formatSize(Math.abs(calibrationOffsetGb as number))}
            </strong>
            <em>
              {(calibrationOffsetGb as number) > 0.01
                ? ' no detalhamento (uso que faltava)'
                : (calibrationOffsetGb as number) < -0.01
                  ? ' no detalhamento (modelo a mais)'
                  : ' (sem diff)'}
            </em>
          </p>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={onClear}
            aria-label="Remover calibragem"
            title="Remover calibragem"
          >
            <TrashIcon />
          </button>
        </div>
      ) : null}
    </section>
  )
}
