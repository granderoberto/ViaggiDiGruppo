import { useEffect, useMemo, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { ApiError } from '../../core/api/apiClient'
import { getCurrentPosition, haversineDistanceKm } from '../../utils/geo'
import { Banner } from '../../ui/components/Banner'
import { Button } from '../../ui/components/Button'
import { Card } from '../../ui/components/Card'
import { EmptyState } from '../../ui/components/EmptyState'
import { Field } from '../../ui/components/Field'
import { Spinner } from '../../ui/components/Spinner'
import { listTrips } from '../trips/tripsApi'
import type { TripListItem } from '../trips/types'

const DEFAULT_CENTER: [number, number] = [41.9028, 12.4964]

function MapBinder({ onMapReady }: { onMapReady: (map: LeafletMap) => void }) {
  const map = useMap()

  useEffect(() => {
    onMapReady(map)
  }, [map, onMapReady])

  return null
}

export function MapPage() {
  const [items, setItems] = useState<TripListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PLANNED' | 'DONE'>('ALL')
  const [searchText, setSearchText] = useState('')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapRef, setMapRef] = useState<LeafletMap | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await listTrips()
        setItems(data)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Errore durante il caricamento della mappa')
        }
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const mappedTrips = useMemo(() => {
    const search = searchText.trim().toLowerCase()

    return items
      .filter((trip) => Number.isFinite(trip.destination?.lat) && Number.isFinite(trip.destination?.lng))
      .filter((trip) => {
        if (statusFilter === 'ALL') {
          return true
        }

        return trip.status === statusFilter
      })
      .filter((trip) => {
        if (!search) {
          return true
        }

        const title = trip.title?.toLowerCase() ?? ''
        const city = trip.destination?.city?.toLowerCase() ?? ''
        return title.includes(search) || city.includes(search)
      })
  }, [items, statusFilter, searchText])

  const selectedTrip = useMemo(
    () => (selectedTripId ? mappedTrips.find((trip) => trip.id === selectedTripId) ?? null : null),
    [selectedTripId, mappedTrips],
  )

  const selectedTripDistance = useMemo(() => {
    if (!selectedTrip || !userLocation) {
      return undefined
    }

    const lat = Number(selectedTrip.destination.lat)
    const lng = Number(selectedTrip.destination.lng)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return undefined
    }

    return haversineDistanceKm(userLocation.lat, userLocation.lng, lat, lng)
  }, [selectedTrip, userLocation])

  const handleMyLocation = async () => {
    setLoadingLocation(true)
    setError(null)

    try {
      const coords = await getCurrentPosition()
      setUserLocation(coords)
      mapRef?.setView([coords.lat, coords.lng], 11)
    } catch (geoError) {
      const message = geoError instanceof Error ? geoError.message : 'Errore durante il recupero posizione.'
      setError(`Posizione attuale non disponibile: ${message}`)
    } finally {
      setLoadingLocation(false)
    }
  }

  const centerOnSelected = () => {
    if (!selectedTrip) {
      return
    }

    const lat = Number(selectedTrip.destination.lat)
    const lng = Number(selectedTrip.destination.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return
    }

    mapRef?.setView([lat, lng], 11)
  }

  return (
    <div className="stack">
      <h1>Mappa viaggi</h1>

      {loading ? <Spinner label="Caricamento mappa..." /> : null}
      {error ? <Banner type="error" message={error} /> : null}

      {!loading && !error ? (
        <Card>
          <div className="row">
            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor="map-status-filter">Stato</label>
              <select
                id="map-status-filter"
                className="select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'PLANNED' | 'DONE')}
              >
                <option value="ALL">Tutti</option>
                <option value="PLANNED">PLANNED</option>
                <option value="DONE">DONE</option>
              </select>
            </div>
            <Field
              id="map-search"
              label="Cerca"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Titolo o città"
            />
            <Button type="button" variant="secondary" onClick={handleMyLocation} disabled={loadingLocation}>
              {loadingLocation ? 'Ricerca posizione...' : 'La mia posizione'}
            </Button>
            <Button type="button" variant="secondary" onClick={centerOnSelected} disabled={!selectedTrip}>
              Centra su marker selezionato
            </Button>
          </div>
        </Card>
      ) : null}

      {!loading && !error && mappedTrips.length === 0 ? (
        <EmptyState
          title="Nessun viaggio con coordinate disponibili"
          description="Controlla i filtri o aggiungi latitudine/longitudine ai viaggi per visualizzarli in mappa."
        />
      ) : null}

      {!loading && !error && mappedTrips.length > 0 ? (
        <Card>
          <div style={{ height: 560, width: '100%', position: 'relative' }}>
            <div className="map-overlay" style={{ top: 12, left: 12 }}>
              <strong>Legenda</strong>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#16a34a' }} />
                <span>PLANNED</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#dc2626' }} />
                <span>DONE</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#2563eb' }} />
                <span>La mia posizione</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#eab308' }} />
                <span>Viaggio selezionato</span>
              </div>
            </div>

            {selectedTrip && userLocation && selectedTripDistance !== undefined ? (
              <div className="map-overlay" style={{ bottom: 12, left: 12 }}>
                Distanza dalla tua posizione: <strong>{selectedTripDistance.toFixed(2)} km</strong>
              </div>
            ) : null}

            <MapContainer center={DEFAULT_CENTER} zoom={5} style={{ height: '100%', width: '100%' }}>
              <MapBinder onMapReady={setMapRef} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {mappedTrips.map((trip) => {
                const lat = Number(trip.destination.lat)
                const lng = Number(trip.destination.lng)
                const isSelected = selectedTripId === trip.id
                const baseColor = trip.status === 'DONE' ? '#dc2626' : '#16a34a'
                const color = isSelected ? '#eab308' : baseColor

                return (
                  <CircleMarker
                    key={trip.id}
                    center={[lat, lng]}
                    radius={isSelected ? 10 : 8}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}
                    eventHandlers={{
                      click: () => setSelectedTripId(trip.id),
                    }}
                  >
                    <Popup>
                      <strong>{trip.title}</strong>
                      <br />
                      {trip.destination.city}
                      <br />
                      {trip.startDate}
                      {trip.endDate ? ` → ${trip.endDate}` : ''}
                      <br />
                      Stato: {trip.status}
                      {userLocation ? (
                        <>
                          <br />
                          Distanza: {haversineDistanceKm(userLocation.lat, userLocation.lng, lat, lng).toFixed(2)} km
                        </>
                      ) : null}
                      <br />
                      <Link to={`/trips/${trip.id}`}>Apri dettaglio</Link>
                    </Popup>
                  </CircleMarker>
                )
              })}

              {userLocation ? (
                <CircleMarker
                  center={[userLocation.lat, userLocation.lng]}
                  radius={8}
                  pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.9 }}
                >
                  <Popup>La tua posizione</Popup>
                </CircleMarker>
              ) : null}

              {selectedTrip && userLocation ? (
                <Polyline
                  positions={[
                    [userLocation.lat, userLocation.lng],
                    [Number(selectedTrip.destination.lat), Number(selectedTrip.destination.lng)],
                  ]}
                  pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.75 }}
                />
              ) : null}
            </MapContainer>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
