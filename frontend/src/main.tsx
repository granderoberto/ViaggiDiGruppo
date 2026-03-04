import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { routes } from './app/routes.tsx'
import { AuthProvider } from './core/auth/AuthProvider.tsx'
import 'leaflet/dist/leaflet.css'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={routes} />
    </AuthProvider>
  </StrictMode>,
)
