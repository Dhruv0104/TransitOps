import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import { apiRequest } from '../api/client'

const DEFAULT_CENTER = [20.5937, 78.9629] // India
const DEFAULT_ZOOM = 5

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  const data = await res.json()
  return (
    data.display_name ||
    data.name ||
    `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  )
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

async function fetchDrivingRoute(token, a, b) {
  const params = new URLSearchParams({
    fromLng: String(a.lng),
    fromLat: String(a.lat),
    toLng: String(b.lng),
    toLat: String(b.lat),
  })
  return apiRequest(`/routing/drive?${params}`, { token })
}

function makeIcon(color, label) {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);color:#fff;font:700 11px sans-serif">${label}</span></div>`,
  })
}

const sourceIcon = makeIcon('#0f6b5c', 'A')
const destIcon = makeIcon('#c2410c', 'B')

function FitRoute({ path, source, destination }) {
  const map = useMap()
  useEffect(() => {
    if (path?.length > 1) {
      map.fitBounds(path, { padding: [40, 40] })
      return
    }
    if (source && destination) {
      map.fitBounds(
        [
          [source.lat, source.lng],
          [destination.lat, destination.lng],
        ],
        { padding: [40, 40] }
      )
    } else if (source) {
      map.setView([source.lat, source.lng], 12)
    } else if (destination) {
      map.setView([destination.lat, destination.lng], 12)
    }
  }, [path, source, destination, map])
  return null
}

function MapClickHandler({ pickMode, onPick }) {
  useMapEvents({
    click(e) {
      onPick(pickMode, e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function InvalidateSize() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100)
    return () => clearTimeout(t)
  }, [map])
  return null
}

function PlaceSearch({ label, value, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    clearTimeout(timer.current)
    if (query.trim().length < 3) {
      setResults([])
      return
    }
    timer.current = setTimeout(async () => {
      const places = await searchPlaces(query)
      setResults(places)
      setOpen(true)
    }, 450)
    return () => clearTimeout(timer.current)
  }, [query])

  return (
    <div className="relative">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {label}
        <input
          className="rounded-lg border border-line px-3 py-2 font-normal"
          value={query}
          placeholder="Search place or click map"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
      </label>
      {open && results.length > 0 ? (
        <ul className="absolute z-[1000] mt-1 max-h-40 w-full overflow-auto rounded-lg border border-line bg-white text-sm shadow-lg">
          {results.map((place) => (
            <li key={`${place.place_id}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-accent-soft"
                onClick={() => {
                  onSelect({
                    lat: Number(place.lat),
                    lng: Number(place.lon),
                    label: place.display_name,
                  })
                  setQuery(place.display_name)
                  setOpen(false)
                }}
              >
                {place.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default function TripRouteMap({
  token,
  source,
  destination,
  onRouteChange,
}) {
  const [pickMode, setPickMode] = useState('source')
  const [busy, setBusy] = useState(false)
  const [routePath, setRoutePath] = useState([])
  const [routeMeta, setRouteMeta] = useState(null)
  const [routeError, setRouteError] = useState('')

  const center = useMemo(() => {
    if (source) return [source.lat, source.lng]
    if (destination) return [destination.lat, destination.lng]
    return DEFAULT_CENTER
  }, [source, destination])

  async function applyPoint(role, lat, lng, label) {
    setBusy(true)
    setRouteError('')
    try {
      const resolvedLabel = label || (await reverseGeocode(lat, lng))
      const point = { lat, lng, label: resolvedLabel }
      const nextSource = role === 'source' ? point : source
      const nextDest = role === 'destination' ? point : destination

      if (!nextSource || !nextDest) {
        setRoutePath([])
        setRouteMeta(null)
        onRouteChange({
          source: nextSource,
          destination: nextDest,
          plannedDistance: '',
        })
        if (role === 'source') setPickMode('destination')
        return
      }

      try {
        const route = await fetchDrivingRoute(token, nextSource, nextDest)
        setRoutePath(route.path || [])
        setRouteMeta({
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
        })
        onRouteChange({
          source: nextSource,
          destination: nextDest,
          plannedDistance: String(route.distanceKm),
        })
      } catch (err) {
        setRoutePath([])
        setRouteMeta(null)
        setRouteError(
          err.message ||
            'Could not calculate road distance. Move pins closer to a road/highway.'
        )
        onRouteChange({
          source: nextSource,
          destination: nextDest,
          plannedDistance: '',
        })
      }

      if (role === 'source') setPickMode('destination')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sm:col-span-2 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-ink">Pick on map:</span>
        <button
          type="button"
          onClick={() => setPickMode('source')}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            pickMode === 'source'
              ? 'bg-accent text-white'
              : 'bg-accent-soft text-accent'
          }`}
        >
          Source (A)
        </button>
        <button
          type="button"
          onClick={() => setPickMode('destination')}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            pickMode === 'destination'
              ? 'bg-orange-600 text-white'
              : 'bg-orange-50 text-orange-800'
          }`}
        >
          Destination (B)
        </button>
        {busy ? (
          <span className="text-xs text-muted">Calculating road route…</span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PlaceSearch
          label="Source"
          value={source?.label || ''}
          onSelect={(point) => applyPoint('source', point.lat, point.lng, point.label)}
        />
        <PlaceSearch
          label="Destination"
          value={destination?.label || ''}
          onSelect={(point) =>
            applyPoint('destination', point.lat, point.lng, point.label)
          }
        />
      </div>

      <div className="h-72 overflow-hidden rounded-xl border border-line z-0">
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <InvalidateSize />
          <MapClickHandler
            pickMode={pickMode}
            onPick={(role, lat, lng) => applyPoint(role, lat, lng)}
          />
          <FitRoute path={routePath} source={source} destination={destination} />
          {source ? (
            <Marker position={[source.lat, source.lng]} icon={sourceIcon} />
          ) : null}
          {destination ? (
            <Marker position={[destination.lat, destination.lng]} icon={destIcon} />
          ) : null}
          {routePath.length > 1 ? (
            <Polyline
              positions={routePath}
              pathOptions={{ color: '#0f6b5c', weight: 5, opacity: 0.9 }}
            />
          ) : null}
        </MapContainer>
      </div>

      {routeMeta ? (
        <p className="rounded-lg border border-accent-soft bg-accent-soft/50 px-3 py-2 text-sm text-accent">
          Road distance: <strong>{routeMeta.distanceKm} km</strong>
          {routeMeta.durationMin != null
            ? ` · Est. drive time: ~${routeMeta.durationMin} min`
            : ''}{' '}
          (along highways/roads)
        </p>
      ) : null}

      {routeError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {routeError}
        </p>
      ) : null}

      <p className="text-xs text-muted">
        Distance follows real driving roads (OSRM), not straight-line displacement.
        The green line on the map is the road route.
      </p>
    </div>
  )
}
