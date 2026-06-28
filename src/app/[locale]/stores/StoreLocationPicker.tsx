'use client';

import {useCallback} from 'react';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('./components/LeafletMap'), {ssr: false});

export interface StoreLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
}

export default function StoreLocationPicker({latitude, longitude, onChange}: StoreLocationPickerProps) {
  const handleSelect = useCallback(
    (lat: number, lng: number) => {
      onChange(lat, lng);
    },
    [onChange],
  );

  return <LeafletMap latitude={latitude} longitude={longitude} onSelect={handleSelect} />;
}
