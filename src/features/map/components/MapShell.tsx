import React from 'react';
import Map, { type MapRef, NavigationControl } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import { MapProvider } from '../context/MapContext';

// MapLibre CSS should be imported by the app's CSS pipeline or here
// import 'maplibre-gl/dist/maplibre-gl.css';

interface MapShellProps {
  children?: React.ReactNode;
}

export const MapShell: React.FC<MapShellProps> = ({ children }) => {
  const mapRef = React.useRef<MapRef | null>(null);

  return (
    <MapProvider mapRef={mapRef}>
      <div className="relative h-[100dvh] w-full">
        <Map
          ref={mapRef}
          mapLib={maplibregl}
          initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={import.meta.env.VITE_MAP_STYLE_URL || 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'}
        >
          <NavigationControl position="bottom-right" />
          {children}
        </Map>

        <div className="absolute top-4 right-4 rounded-xl bg-white/80 dark:bg-neutral-800/80 backdrop-blur border border-neutral-200 dark:border-neutral-700 p-3 shadow">
          <div className="text-sm font-medium">View options</div>
          <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">Globe (placeholder)</div>
          <div className="text-xs text-neutral-600 dark:text-neutral-300">Dark mode (theme)</div>
        </div>
      </div>
    </MapProvider>
  );
};
