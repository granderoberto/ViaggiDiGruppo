import { useEffect, useMemo, useState } from 'react'

export interface CountryItem {
  code: string
  name: string
}

interface CountryCachePayload {
  expiresAt: number
  items: CountryItem[]
}

const CACHE_KEY = 'countries-cache-v1'
const TTL_MS = 7 * 24 * 60 * 60 * 1000
let memoryCache: CountryItem[] | null = null

const FALLBACK_COUNTRIES: CountryItem[] = [
  { code: 'IT', name: 'Italia' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Germania' },
  { code: 'ES', name: 'Spagna' },
  { code: 'GB', name: 'Regno Unito' },
  { code: 'US', name: 'Stati Uniti' },
]

function normalizeCountries(raw: unknown): CountryItem[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const mapped: CountryItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const code = typeof (item as { cca2?: unknown }).cca2 === 'string' ? (item as { cca2: string }).cca2 : ''
    const nameCommon =
      (item as { name?: { common?: unknown } }).name &&
      typeof (item as { name?: { common?: unknown } }).name?.common === 'string'
        ? (item as { name: { common: string } }).name.common
        : ''

    if (!code || !nameCommon) {
      continue
    }

    mapped.push({ code: code.toUpperCase(), name: nameCommon })
  }

  const unique = new Map<string, CountryItem>()
  for (const country of mapped) {
    unique.set(country.code, country)
  }

  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function getCachedCountries(): CountryItem[] | null {
  if (memoryCache) {
    return memoryCache
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as CountryCachePayload
    if (!parsed?.expiresAt || !Array.isArray(parsed.items)) {
      return null
    }

    if (parsed.expiresAt < Date.now()) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    memoryCache = parsed.items
    return memoryCache
  } catch {
    return null
  }
}

function setCachedCountries(items: CountryItem[]): void {
  memoryCache = items
  const payload: CountryCachePayload = {
    expiresAt: Date.now() + TTL_MS,
    items,
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
}

export function useCountries() {
  const [countries, setCountries] = useState<CountryItem[]>(() => getCachedCountries() ?? FALLBACK_COUNTRIES)
  const [loading, setLoading] = useState<boolean>(() => getCachedCountries() === null)

  useEffect(() => {
    const cached = getCachedCountries()
    if (cached) {
      setCountries(cached)
      setLoading(false)
      return
    }

    const controller = new AbortController()

    async function loadCountries() {
      setLoading(true)

      try {
        const response = await fetch('https://restcountries.com/v3.1/all', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('countries-fetch-failed')
        }

        const rawData = (await response.json()) as unknown
        const items = normalizeCountries(rawData)

        if (items.length === 0) {
          throw new Error('countries-empty')
        }

        setCachedCountries(items)
        setCountries(items)
      } catch {
        setCountries(FALLBACK_COUNTRIES)
      } finally {
        setLoading(false)
      }
    }

    void loadCountries()

    return () => {
      controller.abort()
    }
  }, [])

  return useMemo(
    () => ({
      countries,
      loading,
    }),
    [countries, loading],
  )
}
