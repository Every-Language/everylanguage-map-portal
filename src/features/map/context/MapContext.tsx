import React from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

interface MapContextValue {
  mapRef: React.MutableRefObject<MapRef | null>;
  flyTo: (opts: { longitude: number; latitude: number; zoom?: number }) => void;
  fitBounds: (bbox: [number, number, number, number], opts?: { padding?: number; maxZoom?: number }) => void;
}

const MapContext = React.createContext<MapContextValue | null>(null);

export const MapProvider: React.FC<{ mapRef: React.MutableRefObject<MapRef | null>; children: React.ReactNode }>
  = ({ mapRef, children }) => {
    const flyTo = React.useCallback((opts: { longitude: number; latitude: number; zoom?: number }) => {
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({ center: [opts.longitude, opts.latitude], zoom: opts.zoom ?? 4, speed: 0.8, curve: 1.2, essential: true });
    }, [mapRef]);

    const fitBounds = React.useCallback((bbox: [number, number, number, number], opts?: { padding?: number; maxZoom?: number }) => {
      const map = mapRef.current;
      if (!map) return;
      try {
        const perform = () => {
          map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], {
            padding: opts?.padding ?? 40,
            maxZoom: opts?.maxZoom ?? 8,
            duration: 900,
            essential: true,
          });
        }

        const underlying = (map as unknown as { getMap?: () => any }).getMap?.()
        if (underlying && typeof underlying.isStyleLoaded === 'function' && !underlying.isStyleLoaded()) {
          underlying.once?.('style.load', perform)
        } else {
          // Defer to next frame to avoid conflicts with ongoing map transitions
          requestAnimationFrame(perform)
        }
      } catch {
        // no-op
      }
    }, [mapRef]);

    const value = React.useMemo(() => ({ mapRef, flyTo, fitBounds }), [mapRef, flyTo, fitBounds]);
    return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
  };

// eslint-disable-next-line react-refresh/only-export-components
export const useMapContext = (): MapContextValue => {
  const ctx = React.useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within MapProvider');
  return ctx;
};
