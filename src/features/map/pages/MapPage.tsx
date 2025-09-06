import React from 'react';
import { MapShell } from '../components/MapShell';
import { MapInspectorPanel } from '../inspector/components/MapInspectorPanel'
import { MapOverlayLayers } from '../inspector/components/MapOverlayLayers'
import { LanguageEntityFilter } from '../components/LanguageEntityFilter';
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
        <LanguageEntityFilter embedded className="p-3" />
        <LayerToggles embedded value={layers} onChange={setLayers} className="p-3" />
      </LeftColumn>
      <MapInspectorPanel />
    </MapShell>
  );
};

export default MapPage;


