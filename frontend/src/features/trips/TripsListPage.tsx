import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../core/api/apiClient'
import { Badge } from '../../ui/components/Badge'
import { Banner } from '../../ui/components/Banner'
import { Button } from '../../ui/components/Button'
import { Card } from '../../ui/components/Card'
import { EmptyState } from '../../ui/components/EmptyState'
import { Spinner } from '../../ui/components/Spinner'
import { listTrips } from './tripsApi'
import type { TripListItem, TripStatus } from './types'

export function TripsListPage() {
  const [items, setItems] = useState<TripListItem[]>([])
  const [statusFilter, setStatusFilter] = useState<TripStatus | ''>('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await listTrips({ status: statusFilter, q: query })
        setItems(data)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Errore durante il caricamento dei viaggi')
        }
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [statusFilter, query])

  const hasItems = useMemo(() => items.length > 0, [items])

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Viaggi</h1>
        <Link to="/trips/new">
          <Button>Nuovo viaggio</Button>
        </Link>
      </div>

      <Card>
        <div className="row">
          <div className="field" style={{ maxWidth: 220 }}>
            <label htmlFor="status-filter">Stato</label>
            <select
              id="status-filter"
              className="select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as TripStatus | '')}
            >
              <option value="">Tutti</option>
              <option value="PLANNED">Pianificato</option>
              <option value="DONE">Concluso</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="q-filter">Cerca</label>
            <input
              id="q-filter"
              className="input"
              placeholder="Titolo o città"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </Card>

      {loading ? <Spinner label="Caricamento viaggi..." /> : null}
      {error ? <Banner type="error" message={error} /> : null}

      {!loading && !error && !hasItems ? (
        <EmptyState title="Nessun viaggio trovato" description="Prova a cambiare filtri o crea un nuovo viaggio." />
      ) : null}

      {!loading && !error && hasItems ? (
        <Card>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Titolo</th>
                  <th>Destinazione</th>
                  <th>Date</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {items.map((trip) => (
                  <tr key={trip.id}>
                    <td>{trip.title}</td>
                    <td>{trip.destination?.city ?? '-'}</td>
                    <td>
                      {trip.startDate}
                      {trip.endDate ? ` → ${trip.endDate}` : ''}
                    </td>
                    <td>
                      <Badge variant={trip.status === 'DONE' ? 'done' : 'planned'}>
                        {trip.status === 'DONE' ? 'Concluso' : 'Pianificato'}
                      </Badge>
                    </td>
                    <td>
                      <Link to={`/trips/${trip.id}`}>Apri dettaglio</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
