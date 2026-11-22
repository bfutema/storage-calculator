import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../hooks/useMediaQuery'
import './FancySelect.css'

export type FancySelectOption = {
  value: string
  label: string
  hint?: string
}

interface FancySelectProps {
  value: string
  options: FancySelectOption[]
  onChange: (value: string) => void
  label?: string
  ariaLabel?: string
  compact?: boolean
  embedded?: boolean
  placeholder?: string
  className?: string
}

type MenuCoords = {
  top?: number
  bottom?: number
  left?: number
  right?: number
  minWidth: number
}

export function FancySelect({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  compact = false,
  embedded = false,
  placeholder = 'Selecionar',
  className,
}: FancySelectProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [coords, setCoords] = useState<MenuCoords | null>(null)
  const isCompactViewport = useMediaQuery('(max-width: 699px)')
  const selected = options.find((option) => option.value === value)
  const visible = open || closing

  function updateCoords() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return

    const gap = 8
    const minWidth = Math.max(rect.width, compact ? 7.5 * 16 : 11 * 16)
    const spaceBelow = window.innerHeight - rect.bottom - gap
    const estimatedHeight = Math.min(options.length * 48 + 24, 280)
    const openUpward = spaceBelow < estimatedHeight && rect.top > spaceBelow

    if (compact) {
      setCoords({
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
        right: Math.max(8, window.innerWidth - rect.right),
        minWidth,
      })
      return
    }

    const left = Math.min(
      rect.left,
      Math.max(8, window.innerWidth - minWidth - 8),
    )

    setCoords({
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
      left,
      minWidth,
    })
  }

  useLayoutEffect(() => {
    if (!visible || isCompactViewport) return
    updateCoords()
  }, [visible, isCompactViewport, options.length, compact])

  useEffect(() => {
    if (!open) return

    const index = Math.max(
      0,
      options.findIndex((option) => option.value === value),
    )
    setActiveIndex(index)

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      if ((target as Element).closest?.('.fancy-select__layer')) return
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
  }, [open, options, value, isCompactViewport])

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

  function handleSelect(next: string) {
    onChange(next)
    requestClose()
  }

  function handleTriggerKey(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!visible) handleOpen()
    }
  }

  function handleListKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % options.length)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + options.length) % options.length)
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const option = options[activeIndex]
      if (option) handleSelect(option.value)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      requestClose()
    }
  }

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    if (closing) setClosing(false)
  }

  const menuStyle: CSSProperties | undefined =
    !isCompactViewport && coords
      ? {
          top: coords.top,
          bottom: coords.bottom,
          left: coords.left,
          right: coords.right,
          minWidth: coords.minWidth,
        }
      : undefined

  const menu = (
    <div
      className={[
        'fancy-select__menu',
        isCompactViewport ? 'fancy-select__menu--sheet' : 'fancy-select__menu--float',
        closing ? 'is-closing' : 'is-open',
      ]
        .filter(Boolean)
        .join(' ')}
      role="listbox"
      id={listId}
      tabIndex={-1}
      aria-activedescendant={`${listId}-${activeIndex}`}
      style={menuStyle}
      onKeyDown={handleListKey}
      onAnimationEnd={handleAnimationEnd}
    >
      {isCompactViewport ? (
        <>
          <div className="fancy-select__sheet-handle" aria-hidden="true" />
          <div className="fancy-select__sheet-head">
            <strong>{label || ariaLabel || 'Selecionar'}</strong>
            <button
              type="button"
              className="fancy-select__sheet-close"
              onClick={requestClose}
            >
              Fechar
            </button>
          </div>
        </>
      ) : null}

      <div className="fancy-select__options">
        {options.map((option, index) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              id={`${listId}-${index}`}
              role="option"
              aria-selected={active}
              className={[
                'fancy-select__option',
                active ? 'is-selected' : '',
                index === activeIndex ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => handleSelect(option.value)}
            >
              <span className="fancy-select__option-copy">
                <strong>{option.label}</strong>
                {option.hint ? <em>{option.hint}</em> : null}
              </span>
              {active ? (
                <span className="fancy-select__check" aria-hidden="true" />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div
      ref={rootRef}
      className={[
        'fancy-select',
        compact ? 'fancy-select--compact' : '',
        embedded ? 'fancy-select--embedded' : '',
        visible ? 'is-open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        ref={triggerRef}
        type="button"
        className="fancy-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={visible ? listId : undefined}
        aria-label={ariaLabel || label}
        onClick={() => (visible ? requestClose() : handleOpen())}
        onKeyDown={handleTriggerKey}
      >
        <span className="fancy-select__value">
          {selected?.label || placeholder}
        </span>
        <span className="fancy-select__chevron" aria-hidden="true" />
      </button>

      {visible
        ? createPortal(
            <div
              className={[
                'fancy-select__layer',
                isCompactViewport ? 'fancy-select__layer--sheet' : 'fancy-select__layer--float',
                closing ? 'is-closing' : 'is-open',
              ].join(' ')}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) requestClose()
              }}
            >
              {menu}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
