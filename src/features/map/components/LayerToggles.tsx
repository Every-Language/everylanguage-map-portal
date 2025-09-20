import React from 'react';

export type LayerKey = 'listening' | 'countries' | 'projects';

interface LayerTogglesProps {
  value: Record<LayerKey, boolean>;
  onChange: (next: Record<LayerKey, boolean>) => void;
  className?: string;
  embedded?: boolean;
  bare?: boolean; // when true, render without its own card container
}

export const LayerToggles: React.FC<LayerTogglesProps> = ({ value, onChange, className, embedded, bare }) => {
  const toggle = (k: LayerKey) => onChange({ ...value, [k]: !value[k] });

  const inner = (
    <div className={className ?? ''}>
      <div className="text-sm font-medium mb-2">Layers</div>
      {(['countries','listening','projects'] as LayerKey[]).map(k => (
        <label key={k} className="flex items-center justify-between text-sm py-1 select-none">
          <span className="capitalize">{k}</span>
          <span className="relative inline-flex items-center">
            <input
              type="checkbox"
              checked={value[k]}
              onChange={() => toggle(k)}
              className="sr-only peer"
              aria-label={`${k} layer toggle`}
            />
            <span className="block w-10 h-6 rounded-full bg-neutral-300 dark:bg-neutral-700 peer-checked:bg-primary-600 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 bg-white rounded-full shadow-sm transform transition peer-checked:translate-x-4" />
          </span>
        </label>
      ))}
    </div>
  )

  const content = bare
    ? inner
    : (
      <div className={`rounded-xl bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-700 shadow p-3 ${className ?? ''}`}>
        {inner}
      </div>
    )

  if (embedded) return content

  return (
    <div className="absolute left-4 top-24">
      {content}
    </div>
  )
};
