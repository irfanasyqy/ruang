/**
 * Tiny i18n layer.
 *
 * Every visible string stays in English in the source and is passed through
 * `t('English source')`. The Indonesian dictionary maps that source string to
 * its translation; anything missing falls back to the English source, so the
 * app can never show a blank label because of a missing entry.
 *
 * The chosen language is remembered per browser (localStorage) and defaults to
 * Indonesian. Switching reloads the page, which keeps every component simple.
 */
import { core } from './i18n/id-core.ts'
import { office } from './i18n/id-office.ts'
import { board } from './i18n/id-board.ts'
import { settings } from './i18n/id-settings.ts'
import { data } from './i18n/id-data.ts'

export type Lang = 'id' | 'en'

const STORAGE_KEY = 'asyqy.lang'
export const DEFAULT_LANG: Lang = 'id'

function readLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'id') return stored
  } catch {
    // storage can be blocked; the default still applies
  }
  return DEFAULT_LANG
}

let current: Lang = readLang()

const dictionary: Record<string, string> = { ...core, ...office, ...board, ...settings, ...data }

export function currentLang(): Lang {
  return current
}

/** Translate an English source string. Unknown strings fall back to English. */
export function t(source: string): string {
  return current === 'id' ? dictionary[source] ?? source : source
}

/** Set the language and reload so every component re-renders with it. */
export function setLang(next: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // ignore storage failures; the reload still applies the in-memory choice
  }
  current = next
  window.location.reload()
}

export function toggleLang(): void {
  setLang(current === 'id' ? 'en' : 'id')
}
