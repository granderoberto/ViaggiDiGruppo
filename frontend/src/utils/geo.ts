export interface Coordinates {
  lat: number
  lng: number
}

export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalizzazione non supportata da questo browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Permesso posizione negato.'))
          return
        }

        reject(new Error('Impossibile recuperare la posizione GPS.'))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  })
}

export function sanitizeNumberInput(value: string): number | undefined {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return undefined
  }

  return parsed
}

export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180
  const earthRadiusKm = 6371

  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}
