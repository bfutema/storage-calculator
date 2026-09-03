import { formatSize } from '../utils/format'
import type { StorageBreakdown } from '../utils/format'
import { CollapsibleSection } from './CollapsibleSection'
import './DiskGauge.css'

interface DiskGaugeProps {
  breakdown: StorageBreakdown
  compact?: boolean
}

export function DiskGauge({ breakdown, compact = false }: DiskGaugeProps) {
  const fill = Math.min(breakdown.usedPercent, 100)
  const over = breakdown.isOverCapacity
  const radius = 88
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (fill / 100) * circumference

  const legend = (
    <ul className="gauge__legend">
      {breakdown.gameSources.length > 0 ? (
        breakdown.gameSources.map((source) => (
          <li key={source.id}>
            <i className="dot" style={{ background: source.color }} />
            {source.name}
            {source.gameCount != null ? (
              <em className="gauge__count">{source.gameCount}</em>
            ) : null}
            <span>{formatSize(source.sizeGb)}</span>
          </li>
        ))
      ) : (
        <li>
          <i className="dot dot--games" />
          Jogos <span>{formatSize(breakdown.gamesGb)}</span>
        </li>
      )}
      <li>
        <i className="dot dot--buffer" />
        Folga updates <span>{formatSize(breakdown.bufferGb)}</span>
      </li>
      {breakdown.categories.map((category) => (
        <li key={category.id}>
          <i className="dot" style={{ background: category.color }} />
          {category.name} <span>{formatSize(category.sizeGb)}</span>
        </li>
      ))}
      {breakdown.isCalibrated &&
      Math.abs(breakdown.calibrationOffsetGb) >= 0.01 ? (
        <li>
          <i className="dot dot--calibration" />
          Calibragem
          <span>{formatSize(Math.abs(breakdown.calibrationOffsetGb))}</span>
        </li>
      ) : null}
      {breakdown.binaryLossGb > 0 ? (
        <li>
          <i className="dot dot--binary" />
          Conversão SO <span>{formatSize(breakdown.binaryLossGb)}</span>
        </li>
      ) : null}
      {breakdown.ssdOverheadGb > 0 ? (
        <li>
          <i className="dot dot--overhead" />
          Overhead SSD <span>{formatSize(breakdown.ssdOverheadGb)}</span>
        </li>
      ) : null}
    </ul>
  )

  return (
    <section
      className={compact ? 'gauge gauge--compact' : 'gauge'}
      aria-label={`Uso do disco ${breakdown.driveName}`}
    >
      <p className="gauge__drive">
        {breakdown.driveName}
        <span>{breakdown.isInternal ? 'Interno' : 'Externo'}</span>
        {breakdown.isCalibrated ? (
          <span className="gauge__calibrated">Calibrado</span>
        ) : null}
      </p>
      <div className="gauge__ring-wrap">
        <svg className="gauge__svg" viewBox="0 0 220 220" aria-hidden="true">
          <circle
            className="gauge__track"
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            strokeWidth="18"
          />
          <circle
            className={`gauge__fill ${over ? 'gauge__fill--over' : ''}`}
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            strokeWidth="18"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 110 110)"
          />
        </svg>
        <div className="gauge__center">
          <p className="gauge__percent">
            {Math.round(Math.min(breakdown.usedPercent, 999))}
            <span>%</span>
          </p>
          <p className="gauge__label">ocupado</p>
        </div>
      </div>

      <div className="gauge__stats">
        <div>
          <span className="gauge__stat-label">Efetiva</span>
          <strong>{formatSize(breakdown.effectiveCapacityGb)}</strong>
        </div>
        <div>
          <span className="gauge__stat-label">Em uso</span>
          <strong className={over ? 'is-over' : ''}>
            {formatSize(breakdown.usedGb)}
          </strong>
        </div>
        <div>
          <span className="gauge__stat-label">
            {over ? 'Faltando' : 'Livre'}
          </span>
          <strong className={over ? 'is-over' : 'is-free'}>
            {formatSize(Math.abs(breakdown.freeGb))}
          </strong>
        </div>
      </div>

      <p className="gauge__advertised">
        Anunciado {formatSize(breakdown.advertisedGb)}
        {breakdown.binaryLossGb > 0 || breakdown.ssdOverheadGb > 0
          ? ` · no SO ${formatSize(breakdown.osCapacityGb)}`
          : ''}
      </p>

      {compact ? (
        <CollapsibleSection
          title="Detalhamento"
          storageKey="storage-calculator:focus-legend-open"
          defaultOpen={false}
          summary={`${breakdown.gameCount} jogos · ${formatSize(breakdown.gamesGb)}`}
        >
          {legend}
        </CollapsibleSection>
      ) : (
        legend
      )}
    </section>
  )
}
