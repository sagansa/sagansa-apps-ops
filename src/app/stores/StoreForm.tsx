'use client';

import { useEffect, useState } from 'react';
import { Store, StoreGroup, StoreInput } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';
import StoreLocationPicker from './StoreLocationPicker';
import { Button } from '@/components/ui/button';

interface StoreFormProps {
  tenantName?: string;
  store?: Store;
  storeGroups?: StoreGroup[];
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: StoreInput) => Promise<void>;
  error?: string | null;
}

export default function StoreForm({
  tenantName,
  store,
  storeGroups = [],
  isOpen,
  loading,
  onClose,
  onSubmit,
  error,
}: StoreFormProps) {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [storeGroupId, setStoreGroupId] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [radius, setRadius] = useState('');
  const [coordinateInput, setCoordinateInput] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const COORD_DECIMALS = 7;
  const COORD_SEPARATOR = ', ';

  const formatCoordinatePair = (latitude: number | null | undefined, longitude: number | null | undefined): string => {
    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return '';
    }

    return `${latitude.toFixed(COORD_DECIMALS)}${COORD_SEPARATOR}${longitude.toFixed(COORD_DECIMALS)}`;
  };

  const parseCoordinatePair = (input: string): { latitude: number; longitude: number } | null => {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    const cleaned = trimmed.replace(/;/g, ',').replace(/\s+/g, ' ');
    const candidateSets = [
      cleaned.split(',').map((value) => value.trim()).filter(Boolean),
      cleaned.split(' ').map((value) => value.trim()).filter(Boolean),
    ];

    for (const parts of candidateSets) {
      if (parts.length >= 2) {
        const latitudeValue = Number(parts[0]);
        const longitudeValue = Number(parts[1]);

        if (
          Number.isFinite(latitudeValue) &&
          Number.isFinite(longitudeValue) &&
          latitudeValue >= -90 &&
          latitudeValue <= 90 &&
          longitudeValue >= -180 &&
          longitudeValue <= 180
        ) {
          return {
            latitude: latitudeValue,
            longitude: longitudeValue,
          };
        }
      }
    }

    const looseMatch = cleaned.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
    if (looseMatch) {
      const latitudeValue = Number(looseMatch[1]);
      const longitudeValue = Number(looseMatch[2]);

      if (
        Number.isFinite(latitudeValue) &&
        Number.isFinite(longitudeValue) &&
        latitudeValue >= -90 &&
        latitudeValue <= 90 &&
        longitudeValue >= -180 &&
        longitudeValue <= 180
      ) {
        return {
          latitude: latitudeValue,
          longitude: longitudeValue,
        };
      }
    }

    return null;
  };

  useEffect(() => {
    if (store) {
      setName(store.name || '');
      setNickname(store.nickname ?? '');
      setStoreGroupId(store.store_group_id ?? '');
      setEmail(store.email ?? '');
      setStatus(store.status === 'inactive' ? 'inactive' : 'active');
      setRadius(
        typeof store.radius === 'number' && Number.isFinite(store.radius)
          ? String(store.radius)
          : '',
      );
      setCoordinateInput(formatCoordinatePair(store.latitude, store.longitude));
      setAddress(store.address ?? '');
      setPhone(store.phone ?? '');
    } else {
      setName('');
      setNickname('');
      setStoreGroupId('');
      setEmail('');
      setStatus('active');
      setRadius('');
      setCoordinateInput('');
      setAddress('');
      setPhone('');
    }
    setLocalError(null);
  }, [store, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Store name is required.');
      return;
    }

    const trimmedCoordinates = coordinateInput.trim();

    let latitudeValue: number | null = null;
    let longitudeValue: number | null = null;

    if (trimmedCoordinates) {
      const parsed = parseCoordinatePair(trimmedCoordinates);

      if (!parsed) {
        setLocalError('Coordinates must be provided in "latitude, longitude" format.');
        return;
      }

      latitudeValue = parsed.latitude;
      longitudeValue = parsed.longitude;

      setCoordinateInput(formatCoordinatePair(parsed.latitude, parsed.longitude));
    }

    let radiusValue: number | null = null;
    const trimmedRadius = radius.trim();

    if (trimmedRadius) {
      const parsedRadius = Number(trimmedRadius);

      if (!Number.isFinite(parsedRadius) || parsedRadius < 0) {
        setLocalError('Radius must be a positive number.');
        return;
      }

      radiusValue = parsedRadius;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    const payload: StoreInput = {
      name: name.trim(),
      store_group_id: storeGroupId || null,
      nickname: nickname.trim() ? nickname.trim() : null,
      email: trimmedEmail || null,
      status,
      radius: radiusValue,
      latitude: latitudeValue,
      longitude: longitudeValue,
      address: address.trim() || null,
      phone: phone.trim() || null,
    };

    try {
      await onSubmit(payload);
      if (!loading) {
        onClose();
      }
    } catch (error) {
      setLocalError(getErrorMessage(error, 'Failed to save store'));
    }
  };

  const derivedCoordinates = parseCoordinatePair(coordinateInput);
  const derivedLatitude = derivedCoordinates?.latitude ?? null;
  const derivedLongitude = derivedCoordinates?.longitude ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {store ? 'Edit Store' : 'Create Store'}
            </h2>
            {tenantName && (
              <p className="text-xs text-gray-500">Tenant: {tenantName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {(localError || error) && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                {localError || error}
              </div>
            )}

            <div>
              <label htmlFor="store-name" className="block text-sm font-medium text-gray-700">
                Store Name
              </label>
              <input
                id="store-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                placeholder="Enter store name"
              />
            </div>

            <div>
              <label htmlFor="store-nickname" className="block text-sm font-medium text-gray-700">
                Nickname (optional)
              </label>
              <input
                id="store-nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                placeholder="Enter short reference name"
              />
            </div>

            <div>
              <label htmlFor="store-group" className="block text-sm font-medium text-gray-700">
                Store Group (optional)
              </label>
              <select
                id="store-group"
                value={storeGroupId}
                onChange={(e) => setStoreGroupId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="">No group</option>
                {storeGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="store-email" className="block text-sm font-medium text-gray-700">
                Email (optional)
              </label>
              <input
                id="store-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                placeholder="Enter contact email"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="store-status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="store-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label htmlFor="store-radius" className="block text-sm font-medium text-gray-700">
                  Radius (meters)
                </label>
                <input
                  id="store-radius"
                  type="number"
                  min={0}
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  placeholder="Default 100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="store-coordinates" className="block text-sm font-medium text-gray-700">
                Coordinates (optional)
              </label>
              <input
                id="store-coordinates"
                type="text"
                value={coordinateInput}
                onChange={(e) => setCoordinateInput(e.target.value)}
                onBlur={(e) => {
                  const parsed = parseCoordinatePair(e.target.value);
                  if (parsed) {
                    setCoordinateInput(formatCoordinatePair(parsed.latitude, parsed.longitude));
                  }
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                placeholder="Paste coordinates like '-6.1895717, 106.7931118'"
                inputMode="decimal"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-gray-400">
                Accepts latitude and longitude separated by a comma or space. Example: <code>-6.1895717, 106.7931118</code>.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Select on map (optional)</label>
              <p className="mt-1 text-xs text-gray-500">
                Click on the map or drag the marker to populate latitude and longitude. Data comes from OpenStreetMap tiles.
              </p>
              <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                <StoreLocationPicker
                  latitude={derivedLatitude}
                  longitude={derivedLongitude}
                  onChange={(lat, lng) => {
                    setCoordinateInput(formatCoordinatePair(lat, lng));
                  }}
                />
              </div>
              {coordinateInput && (
                <button
                  type="button"
                  onClick={() => {
                    setCoordinateInput('');
                  }}
                  className="mt-3 inline-flex items-center rounded-md border border-transparent bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
                >
                  Clear coordinates
                </button>
              )}
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address (optional)
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                placeholder="Store address"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone (optional)
              </label>
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                placeholder="Phone number"
              />
            </div>

          </div>

          <div className="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : store ? 'Update Store' : 'Create Store'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
