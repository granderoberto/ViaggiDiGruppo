import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './AppShell'
import { RequireAuth } from '../core/auth/RequireAuth'
import { LoginPage } from '../features/login/LoginPage'
import { TripsListPage } from '../features/trips/TripsListPage'
import { TripCreatePage } from '../features/trips/TripCreatePage'
import { TripDetailPage } from '../features/trips/TripDetailPage'
import { MapPage } from '../features/map/MapPage'

export const routes = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate to="/trips" replace /> },
          { path: '/trips', element: <TripsListPage /> },
          { path: '/trips/new', element: <TripCreatePage /> },
          { path: '/trips/:id', element: <TripDetailPage /> },
          { path: '/map', element: <MapPage /> },
        ],
      },
    ],
  },
])
