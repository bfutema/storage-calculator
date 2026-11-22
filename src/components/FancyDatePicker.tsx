import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { formatReleaseDate } from '../utils/format'
import './FancyDatePicker.css'

interface FancyDatePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  ariaLabel?: string
  placeholder?: string
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type PanelCoords = {
  top?: number
  bottom?: number
  left: number
  width: number
}

function parseIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function toIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function monthLabel(date: Date): string {
  const label = date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function FancyDatePicker({
  value,
  onChange,
  label = 'Data',
  ariaLabel,
  placeholder = 'Escolher data',
}: FancyDatePickerProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = parseIso(value)
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [coords, setCoords] = useState<PanelCoords | null>(null)
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(selected ?? today),
  )
  const isCompactViewport = useMediaQuery('(max-width: 699px)')
  const visible = open || closing

  function updateCoords() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return

    const gap = 8
    const width = Math.min(Math.max(rect.width, 288), window.innerWidth - 16)
    const estimatedHeight = 360
    const spaceBelow = window.innerHeight - rect.bottom - gap
    const openUpward = spaceBelow < estimatedHeight && rect.top > spaceBelow
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8,
    )

    setCoords({
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
      left,
      width,
    })
  }

  useLayoutEffect(() => {
    if (!visible || isCompactViewport) return
    updateCoords()
  }, [visible, isCompactViewport])

  useEffect(() => {
    if (!open) return
    setViewMonth(startOfMonth(selected ?? today))

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      if ((target as Element).closest?.('.fancy-date__layer')) return
      requestClose()
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      }
    }

    function handleReposition() {
      if (isCompactViewport) return
      updateCoords()
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open, selected, today, isCompactViewport])

  function requestClose() {
    if (!open || closing) return
    setClosing(true)
    setOpen(false)
  }

  function handleOpen() {
    updateCoords()
    setClosing(false)
    setOpen(true)
  }

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    if (closing) setClosing(false)
  }

  function pickDate(date: Date) {
    onChange(toIso(date))
    requestClose()
  }

  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth)
    const startOffset = first.getDay()
    const daysInMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + 1,
      0,
    ).getDate()
    const items: Array<{ date: Date; inMonth: boolean }> = []

    for (let i = 0; i < startOffset; i += 1) {
      const date = new Date(
        viewMonth.getFullYear(),
        viewMonth.getMonth(),
        i - startOffset + 1,
      )
      items.push({ date, inMonth: false })
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({
        date: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day),
        inMonth: true,
      })
    }

    while (items.length % 7 !== 0) {
      const last = items[items.length - 1]?.date ?? first
      const date = new Date(
        last.getFullYear(),
        last.getMonth(),
        last.getDate() + 1,
      )
      items.push({ date, inMonth: false })
    }

    return items
  }, [viewMonth])

  const panelStyle: CSSProperties | undefined =
    !isCompactViewport && coords
      ? {
          top: coords.top,
          bottom: coords.bottom,
          left: coords.left,
          width: coords.width,
        }
      : undefined

  const panel = (
    <div
      className={[
        'fancy-date__panel',
        isCompactViewport ? 'fancy-date__panel--sheet' : 'fancy-date__panel--float',
        closing ? 'is-closing' : 'is-open',
      ]
        .filter(Boolean)
        .join(' ')}
      id={listId}
      role="dialog"
      aria-label={ariaLabel || label}
      style={panelStyle}
      onAnimationEnd={handleAnimationEnd}
    >
      {isCompactViewport ? (
        <div className="fancy-date__sheet-handle" aria-hidden="true" />
      ) : null}

      <div className="fancy-date__toolbar">
        <button
          type="button"
          className="fancy-date__nav"
          onClick={() => setViewMonth((month) => addMonths(month, -1))}
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <strong>{monthLabel(viewMonth)}</strong>
        <button
          type="button"
          className="fancy-date__nav"
          onClick={() => setViewMonth((month) => addMonths(month, 1))}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>

      <div className="fancy-date__weekdays" aria-hidden="true">
        {WEEKDAYS.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>

      <div className="fancy-date__grid">
        {cells.map(({ date, inMonth }) => {
          const iso = toIso(date)
          const isSelected = selected ? sameDay(date, selected) : false
          const isToday = sameDay(date, today)
          return (
            <button
              key={iso + String(inMonth)}
              type="button"
              className={[
                'fancy-date__day',
                inMonth ? '' : 'is-muted',
                isSelected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => pickDate(date)}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      <div className="fancy-date__footer">
        <button
          type="button"
          className="fancy-date__ghost"
          onClick={() => {
            onChange('')
            requestClose()
          }}
        >
          Limpar
        </button>
        <button
          type="button"
          className="fancy-date__ghost"
          onClick={() => {
            setViewMonth(startOfMonth(today))
            pickDate(today)
          }}
        >
          Hoje
        </button>
        {isCompactViewport ? (
          <button
            type="button"
            className="fancy-date__ghost"
            onClick={requestClose}
          >
            Fechar
          </button>
        ) : null}
      </div>
    </div>
  )

  return (
    <div
      ref={rootRef}
      className={['fancy-date', visible ? 'is-open' : ''].filter(Boolean).join(' ')}
    >
      <button
        ref={triggerRef}
        type="button"
        className="fancy-date__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={visible ? listId : undefined}
        aria-label={ariaLabel || label}
        onClick={() => (visible ? requestClose() : handleOpen())}
      >
        <span className={selected ? '' : 'is-placeholder'}>
          {selected ? formatReleaseDate(value) : placeholder}
        </span>
        <span className="fancy-date__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect
              x="3.5"
              y="5.5"
              width="17"
              height="15"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M8 3.5v4M16 3.5v4M3.5 10h17"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>

      {visible
        ? createPortal(
            <div
              className={[
                'fancy-date__layer',
                isCompactViewport ? 'fancy-date__layer--sheet' : 'fancy-date__layer--float',
                closing ? 'is-closing' : 'is-open',
              ].join(' ')}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) requestClose()
              }}
            >
              {panel}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
