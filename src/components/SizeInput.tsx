import type { SizeUnit } from '../types'
import { FancySelect } from './FancySelect'
import './SizeInput.css'

const UNIT_OPTIONS = [
  { value: 'MB', label: 'MB' },
  { value: 'GB', label: 'GB' },
  { value: 'TB', label: 'TB' },
]

interface SizeInputProps {
  value: string
  unit: SizeUnit
  onValueChange: (value: string) => void
  onUnitChange: (unit: SizeUnit) => void
  placeholder?: string
  autoFocus?: boolean
}

export function SizeInput({
  value,
  unit,
  onValueChange,
  onUnitChange,
  placeholder = '60',
  autoFocus = false,
}: SizeInputProps) {
  return (
    <div className="size-input">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Tamanho"
        autoFocus={autoFocus}
      />
      <FancySelect
        embedded
        compact
        className="size-input__unit"
        label="Unidade"
        ariaLabel="Unidade de tamanho"
        value={unit}
        onChange={(next) => onUnitChange(next as SizeUnit)}
        options={UNIT_OPTIONS}
      />
    </div>
  )
}
