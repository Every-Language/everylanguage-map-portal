import React from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { normalizeBboxForMap, centerOfBbox } from '../inspector/utils/geo'

interface MapContextValue {
  mapRef: React.MutableRefObject<MapRef | null>;
  flyTo: (opts: { longitude: number; latitude: number; zoom?: number }) => void;
  fitBounds: (bbox: [number, number, number, number], opts?: { padding?: number; maxZoom?: number }) => void;
}

const MapContext = React.createContext<MapContextValue | null>(null);

export const MapProvider: React.FC<{ mapRef: React.MutableRefObject<MapRef | null>; children: React.ReactNode }>
  = ({ mapRef, children }) => {
    const userInteractedRef = React.useRef(false)

    // Mark user interaction to avoid fighting their camera; reset on programmatic moves
    React.useEffect(() => {
      const map = mapRef.current?.getMap?.() as any
      if (!map) return
      const onUserMoveStart = () => { userInteractedRef.current = true }
      map.on?.('dragstart', onUserMoveStart)
      map.on?.('zoomstart', onUserMoveStart)
      map.on?.('rotatestart', onUserMoveStart)
      return () => {
        map.off?.('dragstart', onUserMoveStart)
        map.off?.('zoomstart', onUserMoveStart)
        map.off?.('rotatestart', onUserMoveStart)
      }
    }, [mapRef])
    const flyTo = React.useCallback((opts: { longitude: number; latitude: number; zoom?: number }) => {
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({ center: [opts.longitude, opts.latitude], zoom: opts.zoom ?? 4, speed: 0.8, curve: 1.2, essential: true });
    }, [mapRef]);

    const fitBounds = React.useCallback((bbox: [number, number, number, number], opts?: { padding?: number; maxZoom?: number }) => {
      const map = mapRef.current;
      if (!map) return;
      try {
        const { box, recommendFlyTo } = normalizeBboxForMap(bbox)
        const perform = () => {
          // Stop any in-flight animations before starting a new camera op
          try { (map as unknown as { stop?: () => void }).stop?.() } catch {}
          const getLngLat = () => {
            try { return (map as unknown as { getCenter?: () => { lng: number; lat: number } }).getCenter?.() } catch { return undefined }
          }
          const getZoom = () => {
            try { return (map as unknown as { getZoom?: () => number }).getZoom?.() } catch { return undefined }
          }
          const beforeCenter = getLngLat()
          const beforeZoom = getZoom()
          if (recommendFlyTo) {
            const [cx, cy] = centerOfBbox(box)
            userInteractedRef.current = false
            map.flyTo({ center: [cx, cy], zoom: opts?.maxZoom ?? 4, essential: true })
            return
          }
          userInteractedRef.current = false
          map.fitBounds([[box[0], box[1]], [box[2], box[3]]], {
            padding: opts?.padding ?? 40,
            maxZoom: opts?.maxZoom ?? 8,
            duration: 900,
            essential: true,
          });
          // Fallback: if camera didn't change, force a flyTo to center
          setTimeout(() => {
            const afterCenter = getLngLat()
            const afterZoom = getZoom()
            if (beforeCenter && afterCenter && beforeZoom !== undefined && afterZoom !== undefined) {
              const dLng = Math.abs(afterCenter.lng - beforeCenter.lng)
              const dLat = Math.abs(afterCenter.lat - beforeCenter.lat)
              const dZ = Math.abs(afterZoom - beforeZoom)
              if (dLng < 0.0001 && dLat < 0.0001 && dZ < 0.01) {
                const [cx, cy] = centerOfBbox(box)
                try { (map as unknown as { stop?: () => void }).stop?.() } catch {}
                map.flyTo({ center: [cx, cy], zoom: Math.min(opts?.maxZoom ?? 8, 7), essential: true })
              }
            }
          }, 450)
        }

        const underlying = (map as unknown as { getMap?: () => any }).getMap?.()
        if (underlying && typeof underlying.isStyleLoaded === 'function' && !underlying.isStyleLoaded()) {
          underlying.once?.('style.load', perform)
        } else if (underlying && (underlying.isMoving?.() || underlying.isZooming?.() || underlying.isRotating?.())) {
          // Defer until current user move finishes
          underlying.once?.('moveend', () => requestAnimationFrame(perform))
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
