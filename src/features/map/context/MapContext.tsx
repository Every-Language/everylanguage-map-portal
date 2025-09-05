import React from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

interface MapContextValue {
  mapRef: React.MutableRefObject<MapRef | null>;
  flyTo: (opts: { longitude: number; latitude: number; zoom?: number }) => void;
}

const MapContext = React.createContext<MapContextValue | null>(null);

export const MapProvider: React.FC<{ mapRef: React.MutableRefObject<MapRef | null>; children: React.ReactNode }>
  = ({ mapRef, children }) => {
    const flyTo = React.useCallback((opts: { longitude: number; latitude: number; zoom?: number }) => {
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({ center: [opts.longitude, opts.latitude], zoom: opts.zoom ?? 4, speed: 0.8, curve: 1.2, essential: true });
    }, [mapRef]);

    const value = React.useMemo(() => ({ mapRef, flyTo }), [mapRef, flyTo]);
    return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
  };

export const useMapContext = (): MapContextValue => {
  const ctx = React.useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within MapProvider');
  return ctx;
};
