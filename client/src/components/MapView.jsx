import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

// Map of listings with coordinates, using Leaflet + OpenStreetMap.
// No API key is needed. If no listing has coordinates, a short
// message is shown instead of a broken map.
export default function MapView({ listings }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const plotted = listings.filter(
    (listing) => Number.isFinite(Number(listing.latitude)) && Number.isFinite(Number(listing.longitude)),
  );

  useEffect(() => {
    if (plotted.length === 0 || !mapRef.current) return undefined;
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const first = plotted[0];
    const map = L.map(mapRef.current).setView([Number(first.latitude), Number(first.longitude)], 12);
    mapInstance.current = map;

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    plotted.forEach((listing) => {
      L.marker([Number(listing.latitude), Number(listing.longitude)])
        .addTo(map)
        .bindPopup(
          `<strong>${listing.title}</strong><br>${listing.servings} servings · ${listing.area}<br>${listing.status}`,
        );
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // Rebuild the map when the plotted listings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(plotted.map((l) => [l.id, l.latitude, l.longitude, l.title, l.servings, l.area, l.status]))]);

  if (plotted.length === 0) {
    return (
      <p className="muted">
        No listings have coordinates yet. Add latitude and longitude when creating a listing to see it on the map.
      </p>
    );
  }

  return <div ref={mapRef} className="map" aria-label="Map of listings with coordinates" />;
}
