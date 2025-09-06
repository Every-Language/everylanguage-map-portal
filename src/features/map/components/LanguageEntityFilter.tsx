import React from 'react';
import { useMapContext } from '../context/MapContext';
import { useSetSelection } from '../inspector/state/inspectorStore'
import { useNavigate } from 'react-router-dom'

interface LanguageEntityFilterProps {
  className?: string
  embedded?: boolean
}

export const LanguageEntityFilter: React.FC<LanguageEntityFilterProps> = ({ className, embedded }) => {
  const { flyTo } = useMapContext();
  const [selected, setSelected] = React.useState<string[]>([]);
  const setSelection = useSetSelection()
  const navigate = useNavigate()

  const examples = [
    { id: 'kabyle', name: 'Kabyle', center: { longitude: 3.05, latitude: 36.7, zoom: 5 } },
    { id: 'arabic', name: 'Arabic', center: { longitude: 44.4, latitude: 24.3, zoom: 3.5 } },
    { id: 'swahili', name: 'Swahili', center: { longitude: 37.0, latitude: -3.5, zoom: 4.5 } }
  ];

  const onPick = (id: string) => {
    const found = examples.find(x => x.id === id);
    if (found) flyTo(found.center);
    // Example of driving inspector via selection
    // This demo does not use real IDs
    setSelection({ kind: 'language_entity', id }, { pushRoute: true, focusMap: true })
    navigate(`/map/language/${encodeURIComponent(id)}`)
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const content = (
    <div className={`rounded-xl bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-700 shadow p-3 ${className ?? ''}`}>
      <div className="text-sm font-medium mb-2">Languages</div>
      <div className="flex flex-wrap gap-2">
        {examples.map(x => (
          <button
            key={x.id}
            onClick={() => onPick(x.id)}
            className={`px-2 py-1 text-sm rounded border ${selected.includes(x.id) ? 'bg-primary-100 dark:bg-neutral-800' : 'bg-white dark:bg-neutral-900'} border-neutral-200 dark:border-neutral-700`}
          >
            {x.name}
          </button>
        ))}
      </div>
    </div>
  )

  if (embedded) return content

  return (
    <div className="absolute left-4 top-4 right-4 md:right-auto md:left-4 md:top-4 md:w-auto">
      {content}
    </div>
  )
};
