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
    const lastRequestKeyRef = React.useRef<string | null>(null)
    const lastRequestAtRef = React.useRef<number>(0)

    // Mark user interaction to avoid fighting their camera; reset on programmatic moves
    React.useEffect(() => {
      const map = mapRef.current?.getMap?.()
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
        const opId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        // Drop duplicate requests for the same bbox/maxZoom/padding within 300ms (helps with StrictMode double-effects)
        const key = `${box[0].toFixed(6)},${box[1].toFixed(6)},${box[2].toFixed(6)},${box[3].toFixed(6)}|${opts?.padding ?? 40}|${opts?.maxZoom ?? 8}`
        const now = Date.now()
        if (lastRequestKeyRef.current === key && (now - lastRequestAtRef.current) < 300) {
          try { console.info('[MapContext.fitBounds] skipping duplicate request', { opId, key }) } catch { /* noop */ }
          return
        }
        lastRequestKeyRef.current = key
        lastRequestAtRef.current = now
        try { console.info('[MapContext.fitBounds] request', { opId, inputBbox: bbox, normalizedBbox: box, opts, recommendFlyTo }) } catch { /* noop */ }
        const perform = () => {
          // Stop any in-flight animations before starting a new camera op
          try { (map as unknown as { stop?: () => void }).stop?.() } catch { /* noop */ }
          const getLngLat = () => {
            try { return (map as unknown as { getCenter?: () => { lng: number; lat: number } }).getCenter?.() } catch { return undefined }
          }
          const getZoom = () => {
            try { return (map as unknown as { getZoom?: () => number }).getZoom?.() } catch { return undefined }
          }
          const beforeCenter = getLngLat()
          const beforeZoom = getZoom()
          try { console.info('[MapContext.fitBounds] before', { opId, beforeCenter, beforeZoom }) } catch { /* noop */ }
          const underlyingNow = (map as unknown as { getMap?: () => { once?: (ev: string, fn: () => void) => void; on?: (ev: string, fn: () => void) => void } }).getMap?.()
          try { underlyingNow?.once?.('movestart', () => { try { console.info('[MapContext.fitBounds] movestart', { opId }) } catch { /* noop */ } }) } catch { /* noop */ }
          try { underlyingNow?.once?.('moveend', () => {
            try {
              const afterCenterEvt = getLngLat()
              const afterZoomEvt = getZoom()
              console.info('[MapContext.fitBounds] moveend', { opId, afterCenter: afterCenterEvt, afterZoom: afterZoomEvt })
            } catch { /* noop */ }
          }) } catch { /* noop */ }
          if (recommendFlyTo) {
            const [cx, cy] = centerOfBbox(box)
            userInteractedRef.current = false
            try { console.info('[MapContext.fitBounds] using flyTo to center bbox', { opId, center: [cx, cy], zoom: opts?.maxZoom ?? 4 }) } catch { /* noop */ }
            map.flyTo({ center: [cx, cy], zoom: opts?.maxZoom ?? 4, essential: true })
            return
          }
          userInteractedRef.current = false
          try { console.info('[MapContext.fitBounds] invoking fitBounds', { opId, bbox: [[box[0], box[1]], [box[2], box[3]]], padding: opts?.padding ?? 40, maxZoom: opts?.maxZoom ?? 8 }) } catch { /* noop */ }
          map.fitBounds([[box[0], box[1]], [box[2], box[3]]], {
            padding: opts?.padding ?? 40,
            maxZoom: opts?.maxZoom ?? 8,
            duration: 900,
            essential: true,
          });
          // Note: previously we used a fallback flyTo if no significant change occurred.
          // At the user's request, this behavior has been removed to avoid unexpected zooms.
        }

        const underlying = (map as unknown as { getMap?: () => { isStyleLoaded?: () => boolean; once?: (ev: string, fn: () => void) => void; on?: (ev: string, fn: () => void) => void; isMoving?: () => boolean; isZooming?: () => boolean; isRotating?: () => boolean } }).getMap?.()
        if (underlying && typeof underlying.isStyleLoaded === 'function' && !underlying.isStyleLoaded()) {
          try { console.info('[MapContext.fitBounds] deferring until style.load', { opId }) } catch { /* noop */ }
          underlying.once?.('style.load', perform)
          // Safety net: poll for style load for up to 1500ms in case event was missed
          const start = Date.now()
          const poll = () => {
            const u = (map as unknown as { getMap?: () => { isStyleLoaded?: () => boolean } }).getMap?.()
            const loaded = !!(u && typeof u.isStyleLoaded === 'function' && u.isStyleLoaded())
            if (loaded) {
              try { console.info('[MapContext.fitBounds] style loaded via poll, performing', { opId }) } catch { /* noop */ }
              perform()
              return
            }
            if (Date.now() - start > 1500) {
              try { console.warn('[MapContext.fitBounds] style load timeout; performing anyway', { opId }) } catch { /* noop */ }
              perform()
              return
            }
            requestAnimationFrame(poll)
          }
          requestAnimationFrame(poll)
        } else if (underlying && (underlying.isMoving?.() || underlying.isZooming?.() || underlying.isRotating?.())) {
          // Defer until current user move finishes
          try { console.info('[MapContext.fitBounds] deferring until current moveend', { opId }) } catch { /* noop */ }
          underlying.once?.('moveend', () => requestAnimationFrame(perform))
        } else {
          // Defer to next frame to avoid conflicts with ongoing map transitions
          try { console.info('[MapContext.fitBounds] scheduling on next frame', { opId }) } catch { /* noop */ }
          requestAnimationFrame(perform)
        }
      } catch {
        // no-op: camera ops are best-effort
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
