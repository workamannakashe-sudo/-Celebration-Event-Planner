/**
 * @file shared/engine/geo.js
 * @description Geodesic math and privacy-preserving coordinate utilities.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Compute the Great Circle distance (in kilometers) between two coordinates using Haversine.
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in kilometers, rounded to 1 decimal place
 */
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  if (lat1 === lat2 && lng1 === lng2) return 0;

  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = EARTH_RADIUS_KM * c;
  return parseFloat(d.toFixed(1));
}

/**
 * Coarsen geographic coordinates to 2 decimal places (~1.1 km resolution)
 * to strictly preserve user privacy before network transport.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {{lat: number, lng: number}}
 */
export function coarsenCoordinates(lat, lng) {
  return {
    lat: parseFloat(Number(lat).toFixed(2)),
    lng: parseFloat(Number(lng).toFixed(2)),
  };
}
