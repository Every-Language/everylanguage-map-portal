import React from 'react';

export type LayerKey = 'projects' | 'listening' | 'countries';

interface LayerTogglesProps {
  value: Record<LayerKey, boolean>;
  onChange: (next: Record<LayerKey, boolean>) => void;
}

export const LayerToggles: React.FC<LayerTogglesProps> = ({ value, onChange }) => {
  const toggle = (k: LayerKey) => onChange({ ...value, [k]: !value[k] });

  return (
    <div className="absolute left-4 top-24 rounded-xl bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-700 shadow p-3">
      <div className="text-sm font-medium mb-2">Layers</div>
      {(['projects','countries','listening'] as LayerKey[]).map(k => (
        <label key={k} className="flex items-center gap-2 text-sm py-1">
          <input type="checkbox" checked={value[k]} onChange={() => toggle(k)} />
          <span className="capitalize">{k}</span>
        </label>
      ))}
    </div>
  );
};
