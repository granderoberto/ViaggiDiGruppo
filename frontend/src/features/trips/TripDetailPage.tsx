import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../core/api/apiClient'
import { haversineDistanceKm, getCurrentPosition } from '../../utils/geo'
import { Badge } from '../../ui/components/Badge'
import { Banner } from '../../ui/components/Banner'
import { Button } from '../../ui/components/Button'
import { EmptyState } from '../../ui/components/EmptyState'
import { Field, TextareaField } from '../../ui/components/Field'
import { Modal } from '../../ui/components/Modal'
import { SectionCard } from '../../ui/components/SectionCard'
import { Spinner } from '../../ui/components/Spinner'
import { CityAutocomplete } from './components/CityAutocomplete'
import { LocationPickerMap } from './components/LocationPickerMap'
import { useCountries } from './hooks/useCountries'
import { ActivitiesEditor, ExpensesEditor, ParticipantsEditor } from './TripEditorParts'
import type { EditableActivity, EditableExpense, EditableParticipant } from './TripEditorParts'
import { deleteTrip, downloadTripPdf, getTrip, updateTrip } from './tripsApi'
import type { TripDetail, TripStatus } from './types'

interface EditableTripDetail extends Omit<TripDetail, 'participants' | 'activities' | 'expenses'> {
  participants: EditableParticipant[]
  activities: EditableActivity[]
  expenses: EditableExpense[]
}

interface PendingLocation {
  lat: number
  lng: number
  source: 'gps' | 'map' | 'city'
  cityLabel?: string
  label?: string
}

function defaultTrip(id: string): EditableTripDetail {
  return {
    id,
    title: '',
    status: 'PLANNED',
    startDate: '',
    destination: { city: '' },
    participants: [],
    activities: [],
    expenses: [],
    notes: [],
  }
}

function withRowId<T extends object>(item: T & { rowId?: string }): T & { rowId: string } {
  return {
    ...item,
    rowId: item.rowId ?? crypto.randomUUID(),
  }
}

function normalizeTrip(data: TripDetail, fallbackId: string): EditableTripDetail {
  return {
    ...data,
    id: data.id || fallbackId,
    participants: (data.participants ?? []).map((participant) => withRowId(participant)),
    activities: (data.activities ?? []).map((activity) => withRowId(activity)),
    expenses: (data.expenses ?? []).map((expense) => withRowId(expense)),
    notes: data.notes ?? [],
  }
}

function stripRowId<T extends { rowId: string }>(item: T): Omit<T, 'rowId'> {
  return Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'rowId')) as Omit<T, 'rowId'>
}

type TripSavePayload = Omit<Partial<TripDetail>, 'budget'> & {
  budget?: TripDetail['budget'] | null
}

function toSavePayload(trip: EditableTripDetail): TripSavePayload {
  return {
    ...trip,
    participants: trip.participants.map(stripRowId),
    activities: trip.activities.map(stripRowId),
    expenses: trip.expenses.map(stripRowId),
    notes: (trip.notes ?? []).map((note) => note.trim()).filter(Boolean),
    budget: trip.budget,
  }
}

function formatCoords(lat?: number, lng?: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'Non impostate'
  }

  return `${lat?.toFixed(6)}, ${lng?.toFixed(6)}`
}

export function TripDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { countries: countriesList } = useCountries()

  const [trip, setTrip] = useState<EditableTripDetail>(defaultTrip(id))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [loadingGps, setLoadingGps] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [citySearchError, setCitySearchError] = useState<string | null>(null)
  const [cityQuery, setCityQuery] = useState('')
  const [showCityResults, setShowCityResults] = useState(false)
  const [pendingLocation, setPendingLocation] = useState<PendingLocation | null>(null)

  const [budgetAmountInput, setBudgetAmountInput] = useState('')
  const [budgetCurrency, setBudgetCurrency] = useState('EUR')
  const [budgetRemoved, setBudgetRemoved] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await getTrip(id)
        const normalized = normalizeTrip(data, id)
        setTrip(normalized)
        setCityQuery(normalized.destination.city ?? '')
        setBudgetAmountInput(
          typeof normalized.budget?.amount === 'number' && Number.isFinite(normalized.budget.amount)
            ? String(normalized.budget.amount)
            : '',
        )
        setBudgetCurrency(normalized.budget?.currency ?? 'EUR')
        setBudgetRemoved(false)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Errore durante il caricamento del viaggio')
        }
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      void load()
    }
  }, [id])

  const isValid = useMemo(() => Boolean(trip.title.trim() && trip.startDate.trim() && trip.destination.city?.trim()), [trip])

  const totalExpenses = useMemo(() => {
    return (trip.expenses ?? []).reduce((sum, expense) => {
      const amount = Number(expense.amount)
      if (!Number.isFinite(amount)) {
        return sum
      }
      return sum + amount
    }, 0)
  }, [trip.expenses])

  const parsedBudgetAmount = useMemo(() => {
    if (!budgetAmountInput.trim()) {
      return undefined
    }

    const value = Number(budgetAmountInput.replace(',', '.'))
    if (!Number.isFinite(value) || value < 0) {
      return undefined
    }

    return value
  }, [budgetAmountInput])

  const hasBudget = parsedBudgetAmount !== undefined && !budgetRemoved
  const budgetDiff = hasBudget && parsedBudgetAmount !== undefined ? parsedBudgetAmount - totalExpenses : undefined

  const currentLat = typeof trip.destination.lat === 'number' ? trip.destination.lat : undefined
  const currentLng = typeof trip.destination.lng === 'number' ? trip.destination.lng : undefined

  const pendingDistance = useMemo(() => {
    if (!pendingLocation || typeof currentLat !== 'number' || typeof currentLng !== 'number') {
      return undefined
    }

    return haversineDistanceKm(currentLat, currentLng, pendingLocation.lat, pendingLocation.lng)
  }, [pendingLocation, currentLat, currentLng])

  const proposeLocationChange = (next: PendingLocation) => {
    setPendingLocation(next)
  }

  const confirmLocationChange = () => {
    if (!pendingLocation) {
      return
    }

    setTrip((prev) => ({
      ...prev,
      destination: {
        ...prev.destination,
        lat: pendingLocation.lat,
        lng: pendingLocation.lng,
        city: pendingLocation.cityLabel ? pendingLocation.cityLabel : prev.destination.city,
      },
    }))

    if (pendingLocation.cityLabel) {
      setCityQuery(pendingLocation.cityLabel)
    }

    setFeedback('Posizione aggiornata localmente. Premi “Salva modifiche” per confermare sul server.')
    setPendingLocation(null)
  }

  const handleCountryChange = (nextCountryValue: string) => {
    const nextCountry = nextCountryValue || undefined
    const hasExistingLocation = Number.isFinite(currentLat) && Number.isFinite(currentLng)
    const hasExistingCity = Boolean(trip.destination.city?.trim())

    if (hasExistingLocation || hasExistingCity) {
      const confirmed = window.confirm('Cambiare paese resetta città e coordinate correnti. Continuare?')
      if (!confirmed) {
        return
      }
    }

    setTrip((prev) => ({
      ...prev,
      destination: {
        ...prev.destination,
        country: nextCountry,
        city: '',
        lat: undefined,
        lng: undefined,
      },
    }))
    setCityQuery('')
    setShowCityResults(false)
    setFeedback('Paese aggiornato. Seleziona una città per impostare una nuova posizione.')
  }

  const handleUseGps = async () => {
    setLoadingGps(true)
    setError(null)

    try {
      const coords = await getCurrentPosition()
      proposeLocationChange({
        lat: coords.lat,
        lng: coords.lng,
        source: 'gps',
        label: 'Posizione GPS',
      })
    } catch (gpsError) {
      const message = gpsError instanceof Error ? gpsError.message : 'Errore durante il recupero della posizione GPS.'
      setError(`${message} Puoi selezionare il punto manualmente sulla mappa.`)
    } finally {
      setLoadingGps(false)
    }
  }

  const handleMapPick = (coords: { lat: number; lng: number }) => {
    proposeLocationChange({
      lat: coords.lat,
      lng: coords.lng,
      source: 'map',
      label: 'Selezione da mappa',
    })
  }

  const handleSave = async () => {
    if (!isValid) {
      setError('Compila almeno titolo, data inizio e città.')
      return
    }

    if (budgetAmountInput.trim() && parsedBudgetAmount === undefined) {
      setError('Il budget deve essere un numero valido maggiore o uguale a 0.')
      return
    }

    setSaving(true)
    setError(null)
    setFeedback(null)

    const payload: TripSavePayload = toSavePayload(trip)

    if (budgetRemoved) {
      payload.budget = null
    } else if (parsedBudgetAmount !== undefined) {
      payload.budget = {
        amount: parsedBudgetAmount,
        currency: (budgetCurrency || 'EUR').toUpperCase(),
      }
    } else {
      payload.budget = undefined
    }

    try {
      const updated = await updateTrip(id, payload)
      const normalized = normalizeTrip(updated, id)
      setTrip(normalized)
      setCityQuery(normalized.destination.city ?? '')
      setBudgetAmountInput(
        typeof normalized.budget?.amount === 'number' && Number.isFinite(normalized.budget.amount)
          ? String(normalized.budget.amount)
          : '',
      )
      setBudgetCurrency(normalized.budget?.currency ?? 'EUR')
      setBudgetRemoved(false)
      setFeedback('Modifiche salvate correttamente.')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Errore durante il salvataggio')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmDelete = window.confirm('Confermi l\'eliminazione del viaggio?')
    if (!confirmDelete) {
      return
    }

    try {
      await deleteTrip(id)
      navigate('/trips')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Errore durante l\'eliminazione')
      }
    }
  }

  const handleDownloadPdf = async () => {
    setDownloading(true)
    setError(null)

    try {
      const blob = await downloadTripPdf(id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `trip_${id}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Errore durante il download del PDF')
      }
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return <Spinner label="Caricamento dettaglio viaggio..." />
  }

  if (error && !trip.id) {
    return <Banner type="error" message={error} />
  }

  if (!trip.id) {
    return <EmptyState title="Viaggio non trovato" description="Il viaggio richiesto non è disponibile." />
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Dettaglio viaggio</h1>
        <Badge variant={trip.status === 'DONE' ? 'done' : 'planned'}>{trip.status === 'DONE' ? 'Concluso' : 'Pianificato'}</Badge>
      </div>

      {error ? <Banner type="error" message={error} /> : null}
      {feedback ? <Banner type="success" message={feedback} /> : null}
      {citySearchError ? <Banner type="error" message="Servizio città non disponibile, riprova" /> : null}

      <SectionCard title="Panoramica">
        <div className="stack">
          <div className="row">
            <Field
              id="trip-title"
              label="Titolo"
              requiredLabel
              value={trip.title}
              onChange={(event) => setTrip((prev) => ({ ...prev, title: event.target.value }))}
            />
            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor="trip-status">Stato</label>
              <select
                id="trip-status"
                className="select"
                value={trip.status}
                onChange={(event) => setTrip((prev) => ({ ...prev, status: event.target.value as TripStatus }))}
              >
                <option value="PLANNED">Pianificato</option>
                <option value="DONE">Concluso</option>
              </select>
            </div>
          </div>

          <div className="row">
            <Field
              id="trip-start"
              label="Data inizio"
              type="date"
              requiredLabel
              value={trip.startDate}
              onChange={(event) => setTrip((prev) => ({ ...prev, startDate: event.target.value }))}
            />
            <Field
              id="trip-end"
              label="Data fine"
              type="date"
              value={trip.endDate ?? ''}
              min={trip.startDate || undefined}
              onChange={(event) => setTrip((prev) => ({ ...prev, endDate: event.target.value || undefined }))}
            />
          </div>

          <div className="row">
            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor="trip-country">Paese</label>
              <select
                id="trip-country"
                className="select"
                value={trip.destination.country ?? ''}
                onChange={(event) => handleCountryChange(event.target.value)}
              >
                <option value="">Nessuno</option>
                {countriesList.map((countryItem) => (
                  <option key={countryItem.code} value={countryItem.code}>
                    {countryItem.name}
                  </option>
                ))}
              </select>
            </div>

            <CityAutocomplete
              id="trip-city"
              label="Città"
              required
              countryCode={trip.destination.country ?? ''}
              value={cityQuery}
              onChangeQuery={(query) => {
                setCityQuery(query)
                setTrip((prev) => ({
                  ...prev,
                  destination: {
                    ...prev.destination,
                    city: query,
                  },
                }))
                setShowCityResults(true)
              }}
              onSelect={(selection) => {
                setCityQuery(selection.cityLabel)
                setShowCityResults(false)
                proposeLocationChange({
                  lat: selection.lat,
                  lng: selection.lng,
                  source: 'city',
                  cityLabel: selection.cityLabel,
                  label: selection.label,
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

          <TextareaField
            id="trip-description"
            label="Descrizione"
            value={trip.description ?? ''}
            onChange={(event) => setTrip((prev) => ({ ...prev, description: event.target.value || undefined }))}
          />

          <div className="subcard stack">
            <h3 style={{ margin: 0 }}>Budget & Costi</h3>

            {!hasBudget ? (
              <p className="muted" style={{ margin: 0 }}>
                Nessun budget impostato. Inserisci un importo per monitorare la differenza rispetto alle spese.
              </p>
            ) : null}

            <div className="row">
              <Field
                id="trip-budget-amount"
                label="Budget"
                type="number"
                min="0"
                step="0.01"
                value={budgetAmountInput}
                onChange={(event) => {
                  setBudgetAmountInput(event.target.value)
                  setBudgetRemoved(false)
                }}
              />
              <div className="field" style={{ maxWidth: 220 }}>
                <label htmlFor="trip-budget-currency">Valuta</label>
                <select
                  id="trip-budget-currency"
                  className="select"
                  value={budgetCurrency}
                  onChange={(event) => {
                    setBudgetCurrency(event.target.value.toUpperCase())
                    setBudgetRemoved(false)
                  }}
                >
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div className="field" style={{ maxWidth: 220 }}>
                <label>Totale spese</label>
                <input className="input" readOnly value={`${totalExpenses.toFixed(2)} ${budgetCurrency}`} />
              </div>
            </div>

            {hasBudget && budgetDiff !== undefined ? (
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <p style={{ margin: 0 }}>
                  Budget: <strong>{parsedBudgetAmount?.toFixed(2)} {budgetCurrency}</strong> | Totale: <strong>{totalExpenses.toFixed(2)} {budgetCurrency}</strong>
                </p>
                <Badge variant={budgetDiff >= 0 ? 'planned' : 'done'}>
                  Differenza: {budgetDiff.toFixed(2)} {budgetCurrency}
                </Badge>
              </div>
            ) : null}

            {(trip.budget || hasBudget) ? (
              <div className="row">
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setBudgetAmountInput('')
                    setBudgetCurrency('EUR')
                    setBudgetRemoved(true)
                    setTrip((prev) => ({ ...prev, budget: undefined }))
                  }}
                >
                  Rimuovi budget
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Posizione" actions={<Badge variant="planned">{currentLat && currentLng ? 'Impostata' : 'Da impostare'}</Badge>}>
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>
            {currentLat && currentLng
              ? 'Puoi aggiornare la posizione usando GPS, mappa o selezione città. Ogni modifica richiede conferma.'
              : 'Imposta una posizione per visualizzare il viaggio in mappa.'}
          </p>

          <div className="row">
            <Button type="button" variant="secondary" onClick={handleUseGps} disabled={loadingGps}>
              {loadingGps ? 'Recupero posizione...' : 'Usa la mia posizione'}
            </Button>
          </div>

          <LocationPickerMap
            lat={currentLat}
            lng={currentLng}
            onChange={handleMapPick}
            selectedLabel={trip.destination.city || undefined}
          />

          <div className="row">
            <div className="field" style={{ minWidth: 220 }}>
              <label>Coordinate correnti</label>
              <input className="input" readOnly value={formatCoords(currentLat, currentLng)} />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Partecipanti" actions={<Badge variant="planned">{trip.participants.length}</Badge>}>
        <ParticipantsEditor
          participants={trip.participants ?? []}
          onChange={(participants) => setTrip((prev) => ({ ...prev, participants }))}
        />
      </SectionCard>

      <SectionCard title="Attività">
        <ActivitiesEditor
          activities={trip.activities ?? []}
          onChange={(activities) => setTrip((prev) => ({ ...prev, activities }))}
        />
      </SectionCard>

      <SectionCard title="Spese">
        <ExpensesEditor expenses={trip.expenses ?? []} onChange={(expenses) => setTrip((prev) => ({ ...prev, expenses }))} />
      </SectionCard>

      <SectionCard title="Note">
        <TextareaField
          id="trip-notes"
          label="Note (una riga per nota)"
          value={(trip.notes ?? []).join('\n')}
          onChange={(event) => {
            const lines = event.target.value.split('\n')
            setTrip((prev) => ({ ...prev, notes: lines }))
          }}
        />
      </SectionCard>

      <div className="row">
        <Button onClick={handleSave} disabled={saving || !isValid}>
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </Button>
        <Button variant="secondary" onClick={handleDownloadPdf} disabled={downloading}>
          {downloading ? 'Download...' : 'Scarica PDF'}
        </Button>
        <Button variant="danger" onClick={handleDelete}>
          Elimina viaggio
        </Button>
      </div>

      <Modal
        open={Boolean(pendingLocation)}
        title="Conferma cambio posizione"
        onClose={() => setPendingLocation(null)}
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={() => setPendingLocation(null)}>
              Annulla
            </Button>
            <Button type="button" onClick={confirmLocationChange}>
              Conferma
            </Button>
          </>
        )}
      >
        <p style={{ margin: 0 }}>Vuoi aggiornare la posizione del viaggio?</p>
        <p style={{ margin: 0 }}>
          <strong>Coordinate attuali:</strong> {formatCoords(currentLat, currentLng)}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Nuove coordinate:</strong> {formatCoords(pendingLocation?.lat, pendingLocation?.lng)}
        </p>
        {pendingLocation?.label ? (
          <p style={{ margin: 0 }}>
            <strong>Origine:</strong> {pendingLocation.label}
          </p>
        ) : null}
        {pendingDistance !== undefined ? (
          <p style={{ margin: 0 }}>
            <strong>Distanza stimata:</strong> {pendingDistance.toFixed(2)} km
          </p>
        ) : null}
      </Modal>
    </div>
  )
}
