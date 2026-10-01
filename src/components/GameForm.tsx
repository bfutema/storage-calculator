import { useState, type FormEvent } from 'react'
import {
  DEFAULT_STEAM_SOURCE_ID,
  type GameSource,
  type SizeUnit,
} from '../types'
import { parseSizeInput, normalizeChronologyOrder } from '../utils/format'
import './GameForm.css'

export interface GameFormValues {
  name: string
  sizeGb: number
  sourceId: string
  franchise: string | null
  chronologyOrder: number | null
  releaseDate: string | null
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
  const [error, setError] = useState('')

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
    })
    setName('')
    setSize('')
    setCustomSource('')
    setFranchise('')
    setChronologyOrder('')
    setReleaseDate('')
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

        <label className="field field--size">
          <span>Tamanho</span>
          <div className="size-row">
            <input
              type="text"
              inputMode="decimal"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="60"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as SizeUnit)}
              aria-label="Unidade"
            >
              <option value="MB">MB</option>
              <option value="GB">GB</option>
              <option value="TB">TB</option>
            </select>
          </div>
        </label>

        <label className="field">
          <span>Origem</span>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          >
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
            {onAddSource ? (
              <option value="__new__">+ Nova origem…</option>
            ) : null}
          </select>
        </label>

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

        <label className="field field--order">
          <span>Ordem cronológica</span>
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
          <input
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            aria-label="Data de lançamento"
          />
        </label>

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
