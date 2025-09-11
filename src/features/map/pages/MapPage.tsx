import React from 'react';
import { MapShell } from '../components/MapShell';
import { MapInspectorPanel } from '../inspector/components/MapInspectorPanel'
import { LanguageHierarchy, RegionHierarchy } from '../inspector/components/MapInspectorPanel'
import { useSelection } from '../inspector/state/inspectorStore'
import { MapOverlayLayers } from '../inspector/components/MapOverlayLayers'
// import { LayerToggles } from '../components/LayerToggles';
import { MapSearchBar } from '../components/MapSearchBar';
import { LeftColumn } from '../components/LeftColumn';
import { RouteSync } from '../inspector/components/RouteSync';
import { MapAnalyticsLayers } from '../analytics/MapAnalyticsLayers'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'
import { LinkedLanguagesPanel } from '../components/LinkedLanguagesPanel'
import { LinkedRegionsPanel } from '../components/LinkedRegionsPanel'

// Minimal fade wrapper copied from inspector for left panel reuse
const FadeOnMount: React.FC<{ children: React.ReactNode; className?: string; durationMs?: number }> = ({ children, className, durationMs = 180 }) => {
  const ref = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(4px)'
    el.style.willChange = 'opacity, transform'
    const id = requestAnimationFrame(() => {
      el.style.transition = `opacity ${durationMs}ms ease, transform ${durationMs}ms ease`
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    })
    return () => cancelAnimationFrame(id)
  }, [durationMs])
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

const FadeSwitch: React.FC<{ switchKey: React.Key; children: React.ReactNode; className?: string; durationMs?: number }> = ({ switchKey, children, className, durationMs }) => (
  <FadeOnMount key={switchKey} className={className} durationMs={durationMs}>
    {children}
  </FadeOnMount>
)

const SkeletonLine: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`h-3 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse ${className ?? ''}`} />
)

const LeftHeaderSkeleton: React.FC = () => (
  <div className="flex flex-col gap-2">
    <SkeletonLine className="w-20" />
    <div className="h-5 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse w-40" />
  </div>
)

const LeftBodySkeleton: React.FC = () => (
  <div className="flex flex-col gap-2 p-1">
    <SkeletonLine className="w-3/4" />
    <SkeletonLine className="w-2/3" />
    <div className="ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2 flex flex-col gap-2">
      <SkeletonLine className="w-4/5" />
      <SkeletonLine className="w-3/5" />
    </div>
    <SkeletonLine className="w-1/2" />
  </div>
)

export const MapPage: React.FC = () => {
  const [layers, setLayers] = React.useState({ projects: true, countries: true, listening: true });
  const selection = useSelection()

  const regionHeader = useQuery({
    enabled: !!selection && selection.kind === 'region',
    queryKey: ['left-header-region', selection?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id,name,level')
        .eq('id', (selection as { id: string }).id)
        .single()
      if (error) throw error
      return data as { id: string; name: string; level: string }
    }
  })
  const languageHeader = useQuery({
    enabled: !!selection && selection.kind === 'language_entity',
    queryKey: ['left-header-language', selection?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_entities')
        .select('id,name,level')
        .eq('id', (selection as { id: string }).id)
        .single()
      if (error) throw error
      return data as { id: string; name: string; level: string }
    }
  })
  const headerTitle = regionHeader.data?.name || languageHeader.data?.name || ''
  const headerSubtitle = selection ? (selection.kind === 'language_entity' ? 'LANGUAGE' : selection.kind.toUpperCase()) : ''
  const isLeftLoading = (
    (!!selection && selection.kind === 'region' && (regionHeader.isLoading || (!regionHeader.data && regionHeader.isFetching))) ||
    (!!selection && selection.kind === 'language_entity' && (languageHeader.isLoading || (!languageHeader.data && languageHeader.isFetching)))
  )
  const selectionKey = selection ? `${selection.kind}:${selection.id}` : 'none'
  return (
    <MapShell countriesEnabled={layers.countries}>
      <RouteSync />
      <MapSearchBar />
      <MapOverlayLayers countriesEnabled={layers.countries} />
      {/* Render analytics after overlay so heatmap sits on top visually */}
      <MapAnalyticsLayers show={layers.listening} />
      {/* Left column: width matches inspector (420px) and stacks panels */}
      <LeftColumn layers={layers} onLayersChange={setLayers}>
        <div className="flex flex-col rounded-xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur border border-neutral-200 dark:border-neutral-800 shadow-card dark:shadow-dark-card max-h-[60vh] overflow-hidden">
          <div className="flex-none px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
            <FadeSwitch switchKey={selectionKey}>
              {isLeftLoading ? (
                <LeftHeaderSkeleton />
              ) : (
                <div>
                  <div className="text-xs uppercase tracking-wide text-neutral-500">{headerSubtitle}</div>
                  <div className="text-lg font-semibold leading-tight">{headerTitle}</div>
                </div>
              )}
            </FadeSwitch>
          </div>
          <div className="flex-auto min-h-0 overflow-y-auto p-3 space-y-3" id="left-scroll">
            {isLeftLoading ? (
              <LeftBodySkeleton />
            ) : (
              <FadeSwitch switchKey={selectionKey}>
                <div>
                  {selection?.kind === 'language_entity' && <LanguageHierarchy entityId={selection.id} bare />}
                  {selection?.kind === 'region' && <RegionHierarchy regionId={selection.id} bare />}
                </div>
              </FadeSwitch>
            )}
            {/* Linked panels */}
            {selection?.kind === 'region' && (
              <LinkedLanguagesPanel regionId={selection.id} scrollRef={{ current: document.getElementById('left-scroll') as HTMLDivElement | null }} />
            )}
            {selection?.kind === 'language_entity' && (
              <LinkedRegionsPanel languageId={selection.id} scrollRef={{ current: document.getElementById('left-scroll') as HTMLDivElement | null }} />
            )}
          </div>
        </div>
      </LeftColumn>
      <MapInspectorPanel />
    </MapShell>
  );
};

export default MapPage;


