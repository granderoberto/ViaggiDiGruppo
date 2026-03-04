import { useEffect } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { Icon } from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { Coordinates } from '../../../utils/geo'

Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

interface LocationPickerMapProps {
  lat?: number
  lng?: number
  onChange: (coords: Coordinates) => void
  zoom?: number
  onMapReady?: (map: LeafletMap) => void
  selectedLabel?: string
}

const ITALY_CENTER: [number, number] = [41.9, 12.5]

function ClickHandler({ onChange }: { onChange: (coords: Coordinates) => void }) {
  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })

  return null
}

function Recenter({ lat, lng }: { lat?: number; lng?: number }) {
  const map = useMap()

  useEffect(() => {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return
    }

    map.setView([lat, lng], Math.max(map.getZoom(), 11))
  }, [lat, lng, map])

  return null
}

function MapReady({ onMapReady }: { onMapReady?: (map: LeafletMap) => void }) {
  const map = useMap()

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map)
    }
  }, [map, onMapReady])

  return null
}

export function LocationPickerMap({ lat, lng, onChange, zoom = 6, onMapReady, selectedLabel }: LocationPickerMapProps) {
  const center: [number, number] = typeof lat === 'number' && typeof lng === 'number' ? [lat, lng] : ITALY_CENTER

  return (
    <div style={{ height: 320, width: '100%', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapReady onMapReady={onMapReady} />
        <ClickHandler onChange={onChange} />
        <Recenter lat={lat} lng={lng} />

        {typeof lat === 'number' && typeof lng === 'number' ? (
          <Marker
            position={[lat, lng]}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const marker = event.target
                const position = marker.getLatLng()
                onChange({ lat: position.lat, lng: position.lng })
              },
            }}
          />
        ) : null}
      </MapContainer>
      {selectedLabel ? (
        <p className="field-hint" style={{ margin: '6px 8px 0' }}>
          Posizione selezionata: {selectedLabel}
        </p>
      ) : null}
    </div>
  )
}
