import './DenuvoChip.css'

interface DenuvoChipProps {
  active: boolean
  onChange: (active: boolean) => void
  compact?: boolean
}

export function DenuvoChip({ active, onChange, compact = false }: DenuvoChipProps) {
  return (
    <button
      type="button"
      className={[
        'denuvo-chip',
        compact ? 'denuvo-chip--compact' : '',
        active ? 'is-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={active}
      onClick={() => onChange(!active)}
    >
      <span className="denuvo-chip__mark" aria-hidden="true">
        D
      </span>
      <span className="denuvo-chip__copy">
        <strong>Denuvo</strong>
        <em>{active ? (compact ? 'DRM ativo' : 'Proteção DRM ativa') : compact ? 'Sem DRM' : 'Sem proteção DRM'}</em>
      </span>
      <span className="denuvo-chip__switch" aria-hidden="true">
        <i />
      </span>
    </button>
  )
}
