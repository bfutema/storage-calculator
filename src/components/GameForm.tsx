import { useState, type FormEvent } from 'react'
import {
  DEFAULT_STEAM_SOURCE_ID,
  type GameSource,
  type SizeUnit,
} from '../types'
import { parseSizeInput, normalizeChronologyOrder } from '../utils/format'
import { DenuvoChip } from './DenuvoChip'
import { FancyDatePicker } from './FancyDatePicker'
import { FancySelect } from './FancySelect'
import { SizeInput } from './SizeInput'
import './GameForm.css'

export interface GameFormValues {
  name: string
  sizeGb: number
  sourceId: string
  franchise: string | null
  chronologyOrder: number | null
  releaseDate: string | null
  hasDenuvo: boolean
}

interface GameFormProps {
  sources: GameSource[]
  franchiseSuggestions?: string[]
  defaultSourceId?: string
  onAdd: (values: GameFormValues) => void
  onAddSource?: (name: string) => string | null
  className?: string
  autoFocus?: boolean
}

export function GameForm({
  sources,
  franchiseSuggestions = [],
  defaultSourceId,
  onAdd,
  onAddSource,
  className,
  autoFocus = false,
}: GameFormProps) {
  const initialSource =
    defaultSourceId && sources.some((source) => source.id === defaultSourceId)
      ? defaultSourceId
      : (sources.find((source) => source.id === DEFAULT_STEAM_SOURCE_ID)?.id ??
        sources[0]?.id ??
        '')

  const [name, setName] = useState('')
  const [size, setSize] = useState('')
  const [unit, setUnit] = useState<SizeUnit>('GB')
  const [sourceId, setSourceId] = useState(initialSource)
  const [customSource, setCustomSource] = useState('')
  const [franchise, setFranchise] = useState('')
  const [chronologyOrder, setChronologyOrder] = useState('')
  const [releaseDate, setReleaseDate] = useState('')
  const [hasDenuvo, setHasDenuvo] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [error, setError] = useState('')

  const hasExtraValues = Boolean(
    franchise.trim() || chronologyOrder.trim() || releaseDate,
  )

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    const sizeGb = parseSizeInput(size, unit)

    if (!trimmed) {
      setError('Informe o nome do jogo.')
      return
    }
    if (sizeGb === null || sizeGb <= 0) {
      setError('Informe um tamanho válido.')
      return
    }

    if (chronologyOrder.trim() && normalizeChronologyOrder(chronologyOrder) === null) {
      setError('Ordem cronológica inválida.')
      return
    }

    let resolvedSourceId = sourceId
    if (sourceId === '__new__') {
      const created = onAddSource?.(customSource)
      if (!created) {
        setError('Informe o nome da nova origem.')
        return
      }
      resolvedSourceId = created
    }

    if (!resolvedSourceId) {
      setError('Escolha a origem do jogo.')
      return
    }

    onAdd({
      name: trimmed,
      sizeGb,
      sourceId: resolvedSourceId,
      franchise: franchise.trim() || null,
      chronologyOrder: normalizeChronologyOrder(chronologyOrder),
      releaseDate: releaseDate || null,
      hasDenuvo,
    })
    setName('')
    setSize('')
    setCustomSource('')
    setFranchise('')
    setChronologyOrder('')
    setReleaseDate('')
    setHasDenuvo(false)
    setDetailsOpen(false)
    setSourceId(resolvedSourceId)
    setError('')
  }

  return (
    <form
      className={['game-form', className].filter(Boolean).join(' ')}
      onSubmit={handleSubmit}
    >
      <div className="game-form__fields">
        <label className="field field--name">
          <span>Jogo</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Elden Ring"
            autoComplete="off"
            autoFocus={autoFocus}
          />
        </label>

        <div className="game-form__pair">
          <label className="field field--size">
            <span>Tamanho</span>
            <SizeInput
              value={size}
              unit={unit}
              onValueChange={setSize}
              onUnitChange={setUnit}
            />
          </label>

          <label className="field field--source">
            <span>Origem</span>
            <FancySelect
              label="Origem"
              value={sourceId}
              onChange={setSourceId}
              options={[
                ...sources.map((source) => ({
                  value: source.id,
                  label: source.name,
                })),
                ...(onAddSource
                  ? [{ value: '__new__', label: '+ Nova origem…' }]
                  : []),
              ]}
            />
          </label>
        </div>

        {sourceId === '__new__' ? (
          <label className="field field--span">
            <span>Nome da origem</span>
            <input
              type="text"
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              placeholder="Ex.: Emulador PS3"
              autoComplete="off"
            />
          </label>
        ) : null}

        <DenuvoChip active={hasDenuvo} onChange={setHasDenuvo} />

        <div className={`game-form__details ${detailsOpen || hasExtraValues ? 'is-open' : ''}`}>
          <button
            type="button"
            className="game-form__details-toggle"
            aria-expanded={detailsOpen || hasExtraValues}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            <span>Detalhes opcionais</span>
            <em>{detailsOpen || hasExtraValues ? 'Ocultar' : 'Franquia, ordem, data'}</em>
          </button>

          {detailsOpen || hasExtraValues ? (
            <div className="game-form__details-body">
              <label className="field">
                <span>Franquia</span>
                <input
                  type="text"
                  list="game-franchise-suggestions"
                  value={franchise}
                  onChange={(e) => setFranchise(e.target.value)}
                  placeholder="Ex.: Assassin's Creed"
                  autoComplete="off"
                />
              </label>

              <div className="game-form__pair">
                <label className="field field--order">
                  <span>Ordem</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={chronologyOrder}
                    onChange={(e) => setChronologyOrder(e.target.value)}
                    placeholder="1"
                    aria-label="Ordem cronológica na franquia"
                  />
                </label>

                <label className="field">
                  <span>Lançamento</span>
                  <FancyDatePicker
                    label="Lançamento"
                    ariaLabel="Data de lançamento"
                    value={releaseDate}
                    onChange={setReleaseDate}
                    placeholder="dd/mm/aaaa"
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {franchiseSuggestions.length > 0 ? (
        <datalist id="game-franchise-suggestions">
          {franchiseSuggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      ) : null}

      {error ? <p className="game-form__error">{error}</p> : null}

      <button type="submit" className="btn btn--primary">
        Adicionar jogo
      </button>
    </form>
  )
}
