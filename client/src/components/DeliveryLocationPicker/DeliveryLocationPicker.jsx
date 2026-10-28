import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './DeliveryLocationPicker.css';

const PHILIPPINES_CENTER = [12.8797, 121.774];

const deliveryPinIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        accuracyMeters: null,
        source: 'manual',
      });
    },
  });

  return null;
}

function RecenterMap({ pin }) {
  const map = useMap();

  useEffect(() => {
    if (!pin) return;

    map.flyTo(
      [pin.latitude, pin.longitude],
      Math.max(map.getZoom(), 16),
      { duration: 0.5 },
    );
  }, [map, pin?.latitude, pin?.longitude]);

  return null;
}

function DraggablePin({ pin, onSelect }) {
  const markerRef = useRef(null);

  return (
    <Marker
      ref={markerRef}
      position={[pin.latitude, pin.longitude]}
      icon={deliveryPinIcon}
      draggable
      eventHandlers={{
        dragend() {
          const marker = markerRef.current;
          if (!marker) return;

          const position = marker.getLatLng();

          onSelect({
            latitude: position.lat,
            longitude: position.lng,
            accuracyMeters: null,
            source: 'manual',
          });
        },
      }}
    >
      <Popup>Delivery location</Popup>
    </Marker>
  );
}

export default function DeliveryLocationPicker({ value, onChange, error }) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const handleSelect = (pin) => {
    onChange(pin);
    setLocationError('');
  };

  const handleUseCurrentLocation = () => {
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Location is unavailable in this browser. Place the pin on the map.');
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        handleSelect({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters: coords.accuracy,
          source: 'device',
        });
        setLocating(false);
      },
      (geoError) => {
        const message =
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location permission was denied. Place the pin on the map instead.'
            : 'Could not get your location. Place the pin on the map instead.';

        setLocationError(message);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  };

  const center = value
    ? [value.latitude, value.longitude]
    : PHILIPPINES_CENTER;

  return (
    <section className="delivery-location-picker" aria-labelledby="delivery-pin-title">
      <div className="delivery-location-heading">
        <div>
          <h3 id="delivery-pin-title">
            Delivery pin <span aria-hidden="true">*</span>
          </h3>
          <p>Use your current location or click the map to place the required pin.</p>
        </div>

        <button
          className="delivery-location-button"
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
        >
          {locating ? 'Finding location…' : 'Use my current location'}
        </button>
      </div>

      <div className="delivery-location-map">
        <MapContainer
          center={center}
          zoom={value ? 16 : 5}
          scrollWheelZoom={false}
          aria-label="Map to choose delivery location"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onSelect={handleSelect} />
          <RecenterMap pin={value} />

          {value && <DraggablePin pin={value} onSelect={handleSelect} />}
        </MapContainer>
      </div>

      <p className="delivery-location-hint">
        You can drag the pin to adjust it. Keep the written street address and
        delivery notes in the fields above.
      </p>

      {value && (
        <p className="delivery-location-status" aria-live="polite">
          Pin selected: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
          {value.source === 'device' && value.accuracyMeters != null && (
            <> · device accuracy about ±{Math.round(value.accuracyMeters)} m</>
          )}
        </p>
      )}

      {locationError && (
        <p className="delivery-location-error" role="status">
          {locationError}
        </p>
      )}

      {error && (
        <p className="delivery-location-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}