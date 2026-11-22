import { useCallback, useEffect, useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'storage-calculator:theme'

const THEME_EVENT = 'storage-calculator:theme-change'

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

export function resolveTheme(): Theme {
  const stored = readStoredTheme()
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function themeColor(theme: Theme) {
  return theme === 'dark' ? '#0f1714' : '#eef4ee'
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = themeColor(theme)
}

function subscribe(onStoreChange: () => void) {
  const notify = () => onStoreChange()
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', notify)
  window.addEventListener(THEME_EVENT, notify)
  window.addEventListener('storage', notify)
  return () => {
    media.removeEventListener('change', notify)
    window.removeEventListener(THEME_EVENT, notify)
    window.removeEventListener('storage', notify)
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, resolveTheme, () => 'light' as Theme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    applyTheme(next)
    window.dispatchEvent(new Event(THEME_EVENT))
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  return { theme, setTheme, toggleTheme }
}
