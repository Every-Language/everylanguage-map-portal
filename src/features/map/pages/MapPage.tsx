import React from 'react';
import { MapShell } from '../components/MapShell';
import { SidePanel } from '../components/SidePanel';
import { LanguageEntityFilter } from '../components/LanguageEntityFilter';
import { LayerToggles } from '../components/LayerToggles';

export const MapPage: React.FC = () => {
  const [layers, setLayers] = React.useState({ projects: true, countries: true, listening: true });
  return (
    <MapShell>
      <LanguageEntityFilter />
      <LayerToggles value={layers} onChange={setLayers} />
      <SidePanel />
    </MapShell>
  );
};

export default MapPage;


