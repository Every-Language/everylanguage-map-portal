import React from 'react';
import Map, { type MapRef, NavigationControl } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import type { Map as MLMap, ProjectionSpecification } from 'maplibre-gl';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { useTheme } from '@/shared/theme';
import { MapProvider } from '../context/MapContext';
import { supabase } from '@/shared/services/supabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/shared/theme/hooks/useToast';

// MapLibre CSS should be imported by the app's CSS pipeline or here
// import 'maplibre-gl/dist/maplibre-gl.css';

interface MapShellProps {
  children?: React.ReactNode;
  countriesEnabled?: boolean;
}

export const MapShell: React.FC<MapShellProps> = ({ children, countriesEnabled = true }) => {
  const mapRef = React.useRef<MapRef | null>(null);
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  // No interactiveLayerIds to ensure clicks fire everywhere; we'll filter features manually

  const setProjection = (map: MLMap, globe: boolean) => {
    const projection: ProjectionSpecification = globe ? { type: 'globe' } : { type: 'mercator' };
    map.setProjection(projection);
  };

  const applyAtmosphere = React.useCallback((map: MLMap, mode: 'light' | 'dark') => {
    // Invert day/night based on UI theme:
    // UI light => night globe; UI dark => day globe
    const isUiLight = mode === 'light';

    const skyPropsNight: Record<string, unknown> = {
      'sky-color': '#0b1020',
      'horizon-color': '#1a2340',
      'horizon-fog-blend': 0.7,
      'fog-color': '#0b1020',
      'fog-ground-blend': 0.3,
      'sky-horizon-blend': 0.6,
    };

    const skyPropsDay: Record<string, unknown> = {
      'sky-color': '#87cdea',
      'horizon-color': '#d4e7ff',
      'horizon-fog-blend': 0.5,
      'fog-color': '#cfe6ff',
      'fog-ground-blend': 0.25,
      'sky-horizon-blend': 0.55,
    };

    const skyProps = isUiLight ? skyPropsNight : skyPropsDay;
    // setSky is not typed in maplibre types; guard if present
    (map as unknown as { setSky?: (p: Record<string, unknown>) => void }).setSky?.(skyProps);

    // Add some directional light for subtle shading
    (map as unknown as { setLight?: (l: { anchor: 'map'; position: [number, number, number]; intensity: number; color: string }) => void }).setLight?.({
      anchor: 'map',
      position: [1.2, 90, isUiLight ? 30 : 70],
      intensity: isUiLight ? 0.2 : 0.3,
      color: '#ffffff',
    });
  }, []);

  const mapStyleUrl = React.useMemo(() => {
    // If user provided a style, respect it. Otherwise invert base map by UI theme.
    const envStyle = import.meta.env.VITE_MAP_STYLE_URL as string | undefined;
    if (envStyle && envStyle.length > 0) return envStyle;
    // UI light => day (light basemap). UI dark => night (dark basemap)
    return resolvedTheme === 'light'
      ? 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  }, [resolvedTheme]);

  // Resolve the style JSON ahead of time and inject globe projection to avoid flat→globe flash
  const [resolvedStyle, setResolvedStyle] = React.useState<string | StyleSpecification | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      try {
        const res = await fetch(mapStyleUrl);
        if (!res.ok) throw new Error(`Failed to fetch style: ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        const spec: StyleSpecification = { ...json, projection: { type: 'globe' } };
        setResolvedStyle(spec);
      } catch {
        // Fallback to URL if fetching the style fails
        setResolvedStyle(mapStyleUrl);
      }
    };
    setResolvedStyle(null);
    resolve();
    return () => { cancelled = true; };
  }, [mapStyleUrl]);

  const handleMapLoad = React.useCallback(() => {
    const map = mapRef.current?.getMap() as unknown as MLMap | undefined;
    if (!map) return;
    setProjection(map, true);
    applyAtmosphere(map, resolvedTheme);
    // Re-apply atmosphere after each style change
    map.on('style.load', () => {
      setProjection(map, true);
      applyAtmosphere(map, resolvedTheme);
    });
  }, [applyAtmosphere, resolvedTheme]);

  // Update sky/light when theme changes without forcing a full remount
  React.useEffect(() => {
    const map = mapRef.current?.getMap() as unknown as MLMap | undefined;
    if (!map) return;
    applyAtmosphere(map, resolvedTheme);
  }, [resolvedTheme, applyAtmosphere]);

  const handleMapClick = React.useCallback(async (e: maplibregl.MapLayerMouseEvent) => {
    try {
      if (!countriesEnabled) {
        const map = mapRef.current?.getMap() as unknown as MLMap | undefined;
        if (!map) return;
        const features = map.queryRenderedFeatures(e.point);
        const hasInteractable = features.some((f) => {
          const layerId = (f as unknown as { layer?: { id?: string } }).layer?.id || '';
          // Treat existing analytics layers as interactable, suppress toast
          return layerId.includes('listens-heatmap') || layerId.includes('region-listens');
        });
        if (!hasInteractable) {
          toast({ description: 'Turn on the countries layer to see country borders', duration: 3000, variant: 'info' });
        }
        return;
      }

      const { lng, lat } = e.lngLat;
      type SupabaseRpcLike = { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };
      const { data, error } = await (supabase as unknown as SupabaseRpcLike).rpc('get_region_minimal_by_point', {
        lon: lng,
        lat,
        lookup_level: 'country',
      });
      if (error) {
        console.error('get_region_minimal_by_point error', error);
        return;
      }
      const row = Array.isArray(data) && data.length > 0 ? data[0] as { id?: string | null } : null;
      if (row?.id) {
        navigate(`/map/region/${encodeURIComponent(row.id)}`);
      }
      // If no match (e.g., ocean), do nothing
    } catch (err) {
      console.error('Map click handler failed', err);
    }
  }, [countriesEnabled, navigate, toast]);

  return (
    <MapProvider mapRef={mapRef}>
      <div className="relative h-[100dvh] w-full">
        {resolvedStyle && (
          <Map
            ref={mapRef}
            mapLib={maplibregl}
            initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
            style={{ width: '100%', height: '100%' }}
            mapStyle={resolvedStyle}
            onLoad={handleMapLoad}
            onClick={handleMapClick}
          >
            <NavigationControl position="bottom-right" />
            {children}
          </Map>
        )}

        {/* Left column is rendered from MapPage to align with inspector width */}
      </div>
    </MapProvider>
  );
};
