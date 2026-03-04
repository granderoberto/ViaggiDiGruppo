import { useEffect, useMemo } from 'react'
import { useCitySearch } from '../hooks/useCitySearch'

interface CityAutocompleteProps {
  countryCode: string
  value: string
  onChangeQuery: (query: string) => void
  onSelect: (selection: { cityLabel: string; lat: number; lng: number; label: string }) => void
  required?: boolean
  disabled?: boolean
  id?: string
  label?: string
  showResults?: boolean
  onFocus?: () => void
  onBlur?: () => void
  onSearchError?: (message: string | null) => void
}

export function CityAutocomplete({
  countryCode,
  value,
  onChangeQuery,
  onSelect,
  required = false,
  disabled = false,
  id = 'city-autocomplete',
  label = 'Città',
  showResults = true,
  onFocus,
  onBlur,
  onSearchError,
}: CityAutocompleteProps) {
  const { items, loading, error, minQueryLength } = useCitySearch(countryCode, value)

  useEffect(() => {
    onSearchError?.(error)
  }, [error, onSearchError])

  const shouldShowEmpty = useMemo(
    () => showResults && countryCode.trim().length > 0 && value.trim().length >= minQueryLength && items.length === 0 && !loading,
    [showResults, countryCode, value, minQueryLength, items.length, loading],
  )

  return (
    <div className="field" style={{ position: 'relative' }}>
      <label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        id={id}
        className="input"
        value={value}
        onChange={(event) => onChangeQuery(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled || !countryCode}
        aria-required={required}
        aria-autocomplete="list"
        aria-expanded={showResults}
        placeholder={countryCode ? `Scrivi almeno ${minQueryLength} lettere` : 'Seleziona prima un paese'}
      />

      {countryCode && value.trim().length < minQueryLength ? (
        <p className="field-hint">Digita almeno {minQueryLength} caratteri per cercare città reali.</p>
      ) : null}
      {loading ? <p className="field-hint">Ricerca città in corso...</p> : null}
      {error ? <p className="field-error">Servizio città non disponibile, riprova</p> : null}

      {showResults && countryCode && value.trim().length >= minQueryLength ? (
        <div className="card" role="listbox" aria-label="Risultati città" style={{ padding: 8, marginTop: 6 }}>
          {shouldShowEmpty ? (
            <p className="muted" style={{ margin: 0 }}>
              Nessuna città trovata
            </p>
          ) : (
            <div className="stack" style={{ gap: 6 }}>
              {items.slice(0, 8).map((item, index) => (
                <button
                  key={`${item.label}-${index}`}
                  type="button"
                  className="button button-secondary"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    onSelect({
                      cityLabel: item.city || item.label,
                      lat: item.lat,
                      lng: item.lng,
                      label: item.label,
                    })
                  }}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
