import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, request } from '../../../core/api/apiClient'

export interface CitySuggestion {
  label: string
  city: string
  lat: number
  lng: number
}

interface CitySearchResponse {
  items: CitySuggestion[]
}

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 400
const MIN_REQUEST_INTERVAL_MS = 1000
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const resultsCache = new Map<string, { expiresAt: number; items: CitySuggestion[] }>()
let lastRequestTs = 0

function getCacheKey(countryCode: string, query: string): string {
  return `${countryCode.toUpperCase()}:${query.trim().toLowerCase()}`
}

function getCachedItems(cacheKey: string): CitySuggestion[] | null {
  const cached = resultsCache.get(cacheKey)
  if (!cached) {
    return null
  }

  if (cached.expiresAt < Date.now()) {
    resultsCache.delete(cacheKey)
    return null
  }

  return cached.items
}

function setCachedItems(cacheKey: string, items: CitySuggestion[]): void {
  resultsCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    items,
  })
}

export function useCitySearch(countryCode: string, query: string) {
  const [items, setItems] = useState<CitySuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const requestTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (requestTimerRef.current !== null) {
        window.clearTimeout(requestTimerRef.current)
      }
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const trimmedQuery = query.trim()
    const trimmedCountry = countryCode.trim().toUpperCase()

    if (requestTimerRef.current !== null) {
      window.clearTimeout(requestTimerRef.current)
      requestTimerRef.current = null
    }

    if (!trimmedCountry || trimmedQuery.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort()
      setItems([])
      setLoading(false)
      setError(null)
      return
    }

    const debounceTimer = window.setTimeout(() => {
      const cacheKey = getCacheKey(trimmedCountry, trimmedQuery)
      const cached = getCachedItems(cacheKey)
      if (cached) {
        setItems(cached)
        setLoading(false)
        setError(null)
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestTs))

      requestTimerRef.current = window.setTimeout(async () => {
        setLoading(true)
        setError(null)

        try {
          lastRequestTs = Date.now()
          const data = await request<CitySearchResponse>(
            `/geo/cities?country=${encodeURIComponent(trimmedCountry)}&q=${encodeURIComponent(trimmedQuery)}`,
            { signal: controller.signal },
          )

          const nextItems = Array.isArray(data.items) ? data.items.slice(0, 8) : []
          setCachedItems(cacheKey, nextItems)
          setItems(nextItems)
          setError(null)
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            return
          }

          if (err instanceof ApiError) {
            setError(err.message)
          } else {
            setError('Servizio città non disponibile, riprova')
          }

          setItems([])
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false)
          }
        }
      }, waitMs)
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(debounceTimer)
      if (requestTimerRef.current !== null) {
        window.clearTimeout(requestTimerRef.current)
        requestTimerRef.current = null
      }
      abortRef.current?.abort()
    }
  }, [countryCode, query])

  return useMemo(
    () => ({
      items,
      loading,
      error,
      minQueryLength: MIN_QUERY_LENGTH,
    }),
    [items, loading, error],
  )
}
