import React from 'react';
import { MapShell } from '../components/MapShell';
import { MapInspectorPanel } from '../inspector/components/MapInspectorPanel'
import { HierarchySection } from '../inspector/components/MapInspectorPanel'
import { MapOverlayLayers } from '../inspector/components/MapOverlayLayers'
import { LayerToggles } from '../components/LayerToggles';
import { MapSearchBar } from '../components/MapSearchBar';
import { LeftColumn } from '../components/LeftColumn';
import { RouteSync } from '../inspector/components/RouteSync';

export const MapPage: React.FC = () => {
  const [layers, setLayers] = React.useState({ projects: true, countries: true, listening: true });
  return (
    <MapShell>
      <RouteSync />
      <MapSearchBar />
      <MapOverlayLayers />
      {/* Left column: width matches inspector (420px) and stacks panels */}
      <LeftColumn>
        <div className="rounded-xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur border border-neutral-200 dark:border-neutral-800 p-3 shadow-card dark:shadow-dark-card max-h-[60vh] overflow-hidden overflow-y-auto">
          <HierarchySection />
        </div>
        <LayerToggles embedded value={layers} onChange={setLayers} className="p-3" />
      </LeftColumn>
      <MapInspectorPanel />
    </MapShell>
  );
};

export default MapPage;


