'use client';

import {useEffect, useMemo} from 'react';
import {MapContainer, TileLayer, Marker, useMap, useMapEvents} from 'react-leaflet';
import type {LatLngExpression} from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_POSITION: LatLngExpression = [-6.2000003, 106.816666];
const DEFAULT_ZOOM_WITH_COORDINATES = 15;
const DEFAULT_ZOOM = 5;

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface LeafletMapProps {
  latitude: number | null;
  longitude: number | null;
  onSelect: (latitude: number, longitude: number) => void;
}

function RecenterControl({latitude, longitude}: {latitude: number | null; longitude: number | null}) {
  const map = useMap();

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), DEFAULT_ZOOM_WITH_COORDINATES));
    }
  }, [latitude, longitude, map]);

  return null;
}

function ClickCapture({onSelect}: {onSelect: (latitude: number, longitude: number) => void}) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function DraggableMarker({latitude, longitude, onSelect}: LeafletMapProps) {
  const position = useMemo<LatLngExpression>(() => {
    if (latitude !== null && longitude !== null) {
      return [latitude, longitude];
    }
    return DEFAULT_POSITION;
  }, [latitude, longitude]);

  if (latitude === null || longitude === null) {
    return null;
  }

  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend(event) {
          const marker = event.target as L.Marker;
          const {lat, lng} = marker.getLatLng();
          onSelect(lat, lng);
        },
      }}
    />
  );
}

export default function LeafletMap({latitude, longitude, onSelect}: LeafletMapProps) {
  const center = useMemo<LatLngExpression>(() => {
    if (latitude !== null && longitude !== null) {
      return [latitude, longitude];
    }
    return DEFAULT_POSITION;
  }, [latitude, longitude]);

  const zoom = latitude !== null && longitude !== null ? DEFAULT_ZOOM_WITH_COORDINATES : DEFAULT_ZOOM;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-64 w-full rounded-lg shadow-inner"
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ClickCapture onSelect={onSelect} />
      <RecenterControl latitude={latitude} longitude={longitude} />
      <DraggableMarker latitude={latitude} longitude={longitude} onSelect={onSelect} />
    </MapContainer>
  );
}
