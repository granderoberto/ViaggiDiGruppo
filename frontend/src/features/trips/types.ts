export type TripStatus = 'PLANNED' | 'DONE'

export interface TripDestination {
  city: string
  country?: string
  lat?: number
  lng?: number
}

export interface Participant {
  userId?: string
  name: string
}

export interface Activity {
  title: string
  date?: string
  type?: string
  done?: boolean
}

export interface Expense {
  label: string
  amount: number
  currency?: string
  paidBy?: string
  category?: string
}

export interface Budget {
  amount: number
  currency: string
}

export interface TripListItem {
  id: string
  title: string
  status: TripStatus
  startDate: string
  endDate?: string
  destination: TripDestination
  budget?: Budget
}

export interface TripDetail extends TripListItem {
  description?: string
  participants?: Participant[]
  activities?: Activity[]
  expenses?: Expense[]
  notes?: string[]
  budget?: Budget
  route?: Array<{ label: string; lat: number; lng: number; done?: boolean }>
  checklist?: Array<{ item: string; done?: boolean }>
  weatherPreference?: string
}

export interface TripFilters {
  status?: TripStatus | ''
  q?: string
}

export interface TripCreatePayload {
  title: string
  status?: TripStatus
  startDate: string
  endDate?: string
  destination: TripDestination
  description?: string
  budget?: Budget
}
