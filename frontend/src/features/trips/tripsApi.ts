import { downloadPdf, request } from '../../core/api/apiClient'
import type { TripCreatePayload, TripDetail, TripFilters, TripListItem } from './types'

type TripUpdatePayload = Omit<Partial<TripDetail>, 'budget'> & {
  budget?: TripDetail['budget'] | null
}

interface TripsListData {
  trips: TripListItem[]
}

interface TripData {
  trip: TripDetail
}

interface CreateTripData {
  id: string
  trip: TripDetail
}

function buildQuery(filters?: TripFilters): string {
  const params = new URLSearchParams()

  if (filters?.status) {
    params.set('status', filters.status)
  }

  if (filters?.q?.trim()) {
    params.set('q', filters.q.trim())
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function listTrips(filters?: TripFilters): Promise<TripListItem[]> {
  const data = await request<TripsListData>(`/trips${buildQuery(filters)}`)
  return data.trips
}

export async function getTrip(id: string): Promise<TripDetail> {
  const data = await request<TripData>(`/trips/${id}`)
  return data.trip
}

export async function createTrip(payload: TripCreatePayload): Promise<TripDetail> {
  const data = await request<CreateTripData>('/trips', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return data.trip
}

export async function updateTrip(id: string, payload: TripUpdatePayload): Promise<TripDetail> {
  const data = await request<TripData>(`/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

  return data.trip
}

export async function deleteTrip(id: string): Promise<void> {
  await request<{ deleted: boolean }>(`/trips/${id}`, {
    method: 'DELETE',
  })
}

export async function downloadTripPdf(id: string): Promise<Blob> {
  return downloadPdf(`/trips/${id}/pdf`)
}
