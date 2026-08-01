const BASE = 'https://maps.googleapis.com/maps/api/place'

// Categories used for the "auto-detect nearby facilities" feature (Part 5.3 of the spec).
const NEARBY_CATEGORY_TYPES = {
  hospital: 'hospital',
  school: 'school',
  supermarket: 'supermarket',
  pharmacy: 'pharmacy',
  restaurant: 'restaurant',
  police: 'police',
}

function ensureGooglePlacesConfigured() {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key is not configured.')
  }
}

// ── Nearby Search across all categories, merged into one flat list ───────────
async function nearbySearch(lat, lng, radius = 1500) {
  ensureGooglePlacesConfigured()
  const key = process.env.GOOGLE_PLACES_API_KEY
  const results = []

  await Promise.all(
    Object.entries(NEARBY_CATEGORY_TYPES).map(async ([category, type]) => {
      try {
        const url = `${BASE}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${key}`
        const res = await fetch(url)
        const data = await res.json()
        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          console.error(`[places] nearbySearch(${category}) failed:`, data.status, data.error_message)
          return
        }
        for (const place of data.results || []) {
          results.push({
            name: place.name,
            category,
            latitude: place.geometry?.location?.lat ?? null,
            longitude: place.geometry?.location?.lng ?? null,
            placeId: place.place_id,
          })
        }
      } catch (err) {
        console.error(`[places] nearbySearch(${category}) request failed:`, err.message)
      }
    })
  )

  return results
}

// ── Autocomplete — biased toward a location if lat/lng are given ─────────────
async function autocomplete(input, lat, lng) {
  ensureGooglePlacesConfigured()
  const key = process.env.GOOGLE_PLACES_API_KEY
  const params = new URLSearchParams({ input, key })
  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    params.set('location', `${lat},${lng}`)
    params.set('radius', '50000')
  }

  const res = await fetch(`${BASE}/autocomplete/json?${params.toString()}`)
  const data = await res.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Places autocomplete failed: ${data.status}`)
  }

  return (data.predictions || []).map((p) => ({ description: p.description, placeId: p.place_id }))
}

// ── Place Details — resolves a place_id (from autocomplete) to lat/lng ───────
async function placeDetails(placeId) {
  ensureGooglePlacesConfigured()
  const key = process.env.GOOGLE_PLACES_API_KEY
  const params = new URLSearchParams({ place_id: placeId, fields: 'geometry,formatted_address,name', key })

  const res = await fetch(`${BASE}/details/json?${params.toString()}`)
  const data = await res.json()
  if (data.status !== 'OK') {
    throw new Error(data.error_message || `Place details failed: ${data.status}`)
  }

  const loc = data.result?.geometry?.location
  return {
    name: data.result?.name || null,
    formattedAddress: data.result?.formatted_address || null,
    latitude: loc?.lat ?? null,
    longitude: loc?.lng ?? null,
  }
}

module.exports = { nearbySearch, autocomplete, placeDetails, ensureGooglePlacesConfigured }
