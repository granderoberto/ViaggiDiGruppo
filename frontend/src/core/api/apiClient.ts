import type { ApiEnvelope } from './apiTypes'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export class ApiError extends Error {
  code: string
  details?: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(buildUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    })

    const envelope: ApiEnvelope<T> = await response.json()

    if (!response.ok || !envelope.ok) {
      if (!envelope.ok) {
        throw new ApiError(envelope.error.code, envelope.error.message, envelope.error.details)
      }
      throw new ApiError('HTTP_ERROR', 'Richiesta non riuscita')
    }

    return envelope.data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError('NETWORK_ERROR', 'Errore di rete. Verifica che il backend sia attivo.')
  }
}

export async function downloadPdf(path: string): Promise<Blob> {
  try {
    const response = await fetch(buildUrl(path))

    if (!response.ok) {
      throw new ApiError('PDF_ERROR', 'Impossibile scaricare il PDF')
    }

    return await response.blob()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError('NETWORK_ERROR', 'Errore di rete durante il download del PDF')
  }
}
