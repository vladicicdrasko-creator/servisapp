// Haversine formula – distanca između dvije GPS tačke u metrima
export function gpsDistanca(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const GPS_TOLERANCIJA = 100 // metara

// Uzima trenutnu GPS poziciju
export function uzmiLokaciju() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS nije dostupan na ovom uređaju'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(new Error('Nije moguće uzeti GPS lokaciju')),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

// Provjeri da li je radnik dovoljno blizu aparata
export async function verificirajLokaciju(aparatLat, aparatLng) {
  const pozicija = await uzmiLokaciju()
  const distanca = Math.round(gpsDistanca(pozicija.lat, pozicija.lng, aparatLat, aparatLng))
  return {
    verificiran: distanca <= GPS_TOLERANCIJA,
    distanca,
    lat: pozicija.lat,
    lng: pozicija.lng
  }
}