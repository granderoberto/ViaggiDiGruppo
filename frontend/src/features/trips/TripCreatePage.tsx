import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../core/api/apiClient'
import { Banner } from '../../ui/components/Banner'
import { Button } from '../../ui/components/Button'
import { Card } from '../../ui/components/Card'
import { Field, TextareaField } from '../../ui/components/Field'
import { getCurrentPosition } from '../../utils/geo'
import { CityAutocomplete } from './components/CityAutocomplete'
import { LocationPickerMap } from './components/LocationPickerMap'
import { useCountries } from './hooks/useCountries'
import { createTrip } from './tripsApi'
import type { TripStatus } from './types'

function isEndDateInvalid(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) {
    return false
  }

  return endDate < startDate
}

export function TripCreatePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [country, setCountry] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [city, setCity] = useState('')
  const [lat, setLat] = useState<number | undefined>(undefined)
  const [lng, setLng] = useState<number | undefined>(undefined)
  const [status, setStatus] = useState<TripStatus>('PLANNED')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetCurrency, setBudgetCurrency] = useState('EUR')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingGps, setLoadingGps] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)
  const [showCityResults, setShowCityResults] = useState(false)
  const [citySearchError, setCitySearchError] = useState<string | null>(null)

  const { countries: countriesList, loading: loadingCountries } = useCountries()

  const countryLabel = useMemo(() => {
    const found = countriesList.find((item) => item.code === country)
    return found?.name ?? ''
  }, [countriesList, country])

  const isFormReady = useMemo(
    () => Boolean(title.trim() && startDate.trim() && country.trim() && city.trim() && !dateError),
    [title, startDate, country, city, dateError],
  )

  useEffect(() => {
    if (isEndDateInvalid(startDate, endDate)) {
      setEndDate('')
      setDateError('La data di fine non può precedere la data di inizio')
      setHint('La data di fine è stata azzerata perché non valida rispetto alla data di inizio.')
      return
    }

    if (dateError === 'La data di fine non può precedere la data di inizio') {
      setDateError(null)
    }
  }, [startDate, endDate, dateError])

  const handleCountryChange = (nextCountry: string) => {
    setCountry(nextCountry)
    setCityInput('')
    setCity('')
    setLat(undefined)
    setLng(undefined)
    setShowCityResults(false)
    setHint('Digita almeno 3 lettere nella città per cercare risultati reali.')
  }

  const handleSelectCity = (selected: { label: string; city: string; lat: number; lng: number }) => {
    setCity(selected.city || selected.label)
    setCityInput(selected.city || selected.label)
    setLat(selected.lat)
    setLng(selected.lng)
    setShowCityResults(false)
    setHint('Coordinate aggiornate automaticamente dalla città selezionata.')
  }

  const handleUseGps = async () => {
    setLoadingGps(true)
    setError(null)
    setHint(null)

    try {
      const coords = await getCurrentPosition()
      setLat(coords.lat)
      setLng(coords.lng)
      setHint('Coordinate GPS acquisite con successo.')
    } catch (gpsError) {
      const message = gpsError instanceof Error ? gpsError.message : 'Errore durante il recupero della posizione GPS.'
      setError(`${message} Puoi selezionare il punto manualmente sulla mappa.`)
    } finally {
      setLoadingGps(false)
    }
  }

  const handleMapChange = (coords: { lat: number; lng: number }) => {
    setLat(coords.lat)
    setLng(coords.lng)
    setHint('Coordinate aggiornate dalla mappa. Città e paese restano invariati.')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isEndDateInvalid(startDate, endDate)) {
      setDateError('La data di fine non può precedere la data di inizio')
      setError('Correggi le date prima di salvare.')
      return
    }

    if (!isFormReady) {
      setError('Compila i campi obbligatori: titolo, data inizio, paese e città.')
      return
    }

    setLoading(true)
    setError(null)
    setDateError(null)

    const trimmedBudget = budgetAmount.trim()
    let budgetPayload: { amount: number; currency: string } | undefined
    if (trimmedBudget) {
      const parsedBudget = Number(trimmedBudget.replace(',', '.'))
      if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
        setLoading(false)
        setError('Il budget deve essere un numero valido maggiore o uguale a 0.')
        return
      }

      budgetPayload = {
        amount: parsedBudget,
        currency: (budgetCurrency || 'EUR').toUpperCase(),
      }
    }

    try {
      const created = await createTrip({
        title: title.trim(),
        startDate,
        endDate: endDate || undefined,
        status,
        description: description.trim() || undefined,
        destination: {
          city: city.trim(),
          country: country || undefined,
          lat,
          lng,
        },
        budget: budgetPayload,
      })

      navigate(`/trips/${created.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Errore durante la creazione del viaggio')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stack">
      <h1>Nuovo viaggio</h1>
      <Card>
        <form className="stack" onSubmit={handleSubmit} noValidate>
          {error ? <Banner type="error" message={error} /> : null}
          {hint ? <Banner type="success" message={hint} /> : null}
          {citySearchError ? <Banner type="error" message="Servizio città non disponibile, riprova" /> : null}

          <div className="row">
            <Field id="title" label="Titolo" requiredLabel value={title} onChange={(event) => setTitle(event.target.value)} />
            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor="status">Stato</label>
              <select id="status" className="select" value={status} onChange={(event) => setStatus(event.target.value as TripStatus)}>
                <option value="PLANNED">Pianificato</option>
                <option value="DONE">Concluso</option>
              </select>
            </div>
          </div>

          <div className="row">
            <Field
              id="startDate"
              label="Data inizio"
              type="date"
              requiredLabel
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <div className="field">
              <label htmlFor="endDate">Data fine</label>
              <input
                id="endDate"
                className="input"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => {
                  const next = event.target.value
                  setEndDate(next)
                  if (isEndDateInvalid(startDate, next)) {
                    setDateError('La data di fine non può precedere la data di inizio')
                  } else {
                    setDateError(null)
                  }
                }}
                aria-invalid={Boolean(dateError)}
              />
              <p className="field-hint">La data di fine non può essere precedente alla data di inizio.</p>
              {dateError ? <p className="field-error">{dateError}</p> : null}
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="country">Paese *</label>
              <select
                id="country"
                className="select"
                value={country}
                onChange={(event) => handleCountryChange(event.target.value)}
                aria-required="true"
              >
                <option value="">Seleziona un paese</option>
                {countriesList.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
              {loadingCountries ? <p className="field-hint">Caricamento elenco paesi...</p> : null}
              <p className="field-hint">Il paese viene salvato come codice ISO (es. IT, FR, DE).</p>
            </div>

            <div className="field">
              <CityAutocomplete
                id="city"
                label="Città"
                required
                countryCode={country}
                value={cityInput}
                onChangeQuery={(nextValue) => {
                  setCityInput(nextValue)
                  setCity(nextValue)
                  setShowCityResults(true)
                }}
                onSelect={(item) => {
                  handleSelectCity({
                    label: item.label,
                    city: item.cityLabel,
                    lat: item.lat,
                    lng: item.lng,
                  })
                }}
                showResults={showCityResults}
                onFocus={() => {
                  setCitySearchError(null)
                  setShowCityResults(true)
                }}
                onBlur={() => {
                  window.setTimeout(() => setShowCityResults(false), 150)
                }}
                onSearchError={setCitySearchError}
              />
            </div>
          </div>

          <Card>
            <div className="stack">
              <h2>Posizione (opzionale)</h2>
              <p className="muted">Puoi usare GPS, selezionare un punto in mappa o usare l'autofill da città.</p>
              <div className="row">
                <Button type="button" variant="secondary" onClick={handleUseGps} disabled={loadingGps}>
                  {loadingGps ? 'Recupero posizione...' : 'Usa la mia posizione (GPS)'}
                </Button>
              </div>

              <LocationPickerMap lat={lat} lng={lng} onChange={handleMapChange} />

              <div className="row">
                <div className="field" style={{ minWidth: 180 }}>
                  <label htmlFor="lat-readonly">Latitudine</label>
                  <input id="lat-readonly" className="input" readOnly value={typeof lat === 'number' ? lat.toFixed(6) : ''} />
                </div>
                <div className="field" style={{ minWidth: 180 }}>
                  <label htmlFor="lng-readonly">Longitudine</label>
                  <input id="lng-readonly" className="input" readOnly value={typeof lng === 'number' ? lng.toFixed(6) : ''} />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="stack">
              <h2>Budget (opzionale)</h2>
              <div className="row">
                <Field
                  id="budget-amount"
                  label="Budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetAmount}
                  onChange={(event) => setBudgetAmount(event.target.value)}
                />
                <div className="field" style={{ maxWidth: 220 }}>
                  <label htmlFor="budget-currency">Valuta</label>
                  <select
                    id="budget-currency"
                    className="select"
                    value={budgetCurrency}
                    onChange={(event) => setBudgetCurrency(event.target.value.toUpperCase())}
                  >
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          <TextareaField
            id="description"
            label="Descrizione"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          {countryLabel ? <p className="field-hint">Paese selezionato: {countryLabel} ({country})</p> : null}

          <div className="row">
            <Button type="submit" disabled={!isFormReady || loading}>
              {loading ? 'Salvataggio...' : 'Crea viaggio'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
