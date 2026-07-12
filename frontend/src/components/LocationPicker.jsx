import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const DEFAULT_CENTER = [20.5937, 78.9629]
const DEFAULT_ZOOM = 5

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  const data = await res.json()
  const city =
    data.address?.city ||
    data.address?.town ||
    data.address?.village ||
    data.address?.state_district ||
    data.address?.state
  if (city && data.address?.state) return `${city}, ${data.address.state}`
  return data.display_name || city || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

async function searchPlaces(query) {
  if (!query || query.trim().length < 3) return []
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
    query
  )}&limit=5`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  return res.json()
}

export async function resolveRegionLabel(label) {
  if (!label?.trim()) return null
  try {
    const places = await searchPlaces(label)
    if (places[0]) {
      return {
        lat: Number(places[0].lat),
        lng: Number(places[0].lon),
        label,
      }
    }
  } catch {
    // ignore
  }
  return { label }
}

const pinIcon = L.divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;
    background:#f97316;transform:rotate(-45deg);
    border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);
  "></div>`,
})

function FlyTo({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position?.lat != null && position?.lng != null) {
      map.flyTo([position.lat, position.lng], 11, { duration: 0.6 })
    }
  }, [map, position])
  return null
}

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

/**
 * Single-location map picker for vehicle region.
 * value: string label; onChange(label)
 */
export default function LocationPicker({ value, onChange, height = 260 }) {
  const [point, setPoint] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      if (!value?.trim()) {
        setPoint(null)
        return
      }
      if (point?.label === value && point.lat != null) return
      const resolved = await resolveRegionLabel(value)
      if (!cancelled && resolved?.lat != null) {
        setPoint(resolved)
      } else if (!cancelled) {
        setPoint({ label: value })
      }
    }
    hydrate()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  async function pick(lat, lng, labelOverride) {
    setError('')
    try {
      const label = labelOverride || (await reverseGeocode(lat, lng))
      const next = { lat, lng, label }
      setPoint(next)
      onChange?.(label)
    } catch {
      setError('Could not resolve location')
    }
  }

  async function runSearch() {
    setSearching(true)
    setError('')
    try {
      const places = await searchPlaces(query)
      setResults(places)
      if (places.length === 0) setError('No places found')
    } catch {
      setError('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const center =
    point?.lat != null ? [point.lat, point.lng] : DEFAULT_CENTER

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (!searching && query.trim().length >= 3) runSearch()
            }
          }}
          placeholder="Search city / region…"
          className="field min-w-0 flex-1"
        />
        <button
          type="button"
          disabled={searching || query.trim().length < 3}
          onClick={runSearch}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {searching ? '…' : 'Search'}
        </button>
      </div>

      {results.length > 0 ? (
        <ul className="max-h-28 overflow-y-auto rounded-lg border border-line bg-panel text-sm">
          {results.map((r) => (
            <li key={`${r.place_id}-${r.lat}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-ink hover:bg-accent/15"
                onClick={() => {
                  pick(Number(r.lat), Number(r.lon), r.display_name)
                  setResults([])
                  setQuery('')
                }}
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className="overflow-hidden rounded-xl border border-line"
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={point?.lat != null ? 11 : DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={pick} />
          {point?.lat != null ? (
            <>
              <Marker position={[point.lat, point.lng]} icon={pinIcon} />
              <FlyTo position={point} />
            </>
          ) : null}
        </MapContainer>
      </div>

      <p className="text-xs text-muted">
        Click the map or search to set the operating region.
        {value ? (
          <>
            {' '}
            Selected: <span className="font-semibold text-ink">{value}</span>
          </>
        ) : null}
      </p>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}
