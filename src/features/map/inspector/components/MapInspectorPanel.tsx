import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelection } from '../state/inspectorStore'
import { LanguageEntityView } from '../views/LanguageEntityView'
import { RegionView } from '../views/RegionView'
import { ProjectView } from '../views/ProjectView'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'

// Simple fade-in on mount. Use with a `key` to animate on key changes.
const FadeOnMount: React.FC<{ children: React.ReactNode; className?: string; durationMs?: number }> = ({ children, className, durationMs = 180 }) => {
  const ref = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    // Start hidden, then fade in next frame
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

// Convenience wrapper to fade content whenever the switchKey changes
const FadeSwitch: React.FC<{ switchKey: React.Key; children: React.ReactNode; className?: string; durationMs?: number }> = ({ switchKey, children, className, durationMs }) => {
  return (
    <FadeOnMount key={switchKey} className={className} durationMs={durationMs}>
      {children}
    </FadeOnMount>
  )
}

// Skeleton primitives
const SkeletonLine: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`h-3 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse ${className ?? ''}`} />
)

const HeaderSkeleton: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="flex items-center gap-3">
    <button onClick={onBack} aria-label="Back" className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">←</button>
    <div className="flex flex-col gap-2">
      <SkeletonLine className="w-20" />
      <div className="h-5 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse w-40" />
    </div>
  </div>
)

const BodySkeleton: React.FC = () => (
  <div className="flex flex-col gap-3">
    <div className="flex gap-2">
      <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
      <div className="h-4 w-16 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
    </div>
    <SkeletonLine className="w-3/4" />
    <SkeletonLine className="w-full" />
    <SkeletonLine className="w-5/6" />
    <SkeletonLine className="w-1/2" />
    <SkeletonLine className="w-2/3" />
    <SkeletonLine className="w-3/5" />
  </div>
)

const TreeSkeleton: React.FC<{ bare?: boolean }> = ({ bare }) => (
  bare ? (
    <div className="pt-1 flex flex-col gap-2">
      <SkeletonLine className="w-3/4" />
      <SkeletonLine className="w-2/3" />
      <div className="ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2 flex flex-col gap-2">
        <SkeletonLine className="w-4/5" />
        <SkeletonLine className="w-3/5" />
      </div>
      <SkeletonLine className="w-1/2" />
    </div>
  ) : (
    <div className="mb-2">
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 -mx-3 -mt-3 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <div className="text-xs font-semibold tracking-wide text-neutral-500">Loading relationships…</div>
      </div>
      <div className="pt-2 flex flex-col gap-2">
        <SkeletonLine className="w-3/4" />
        <SkeletonLine className="w-2/3" />
        <div className="ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2 flex flex-col gap-2">
          <SkeletonLine className="w-4/5" />
          <SkeletonLine className="w-3/5" />
        </div>
        <SkeletonLine className="w-1/2" />
      </div>
    </div>
  )
)

const PanelBody: React.FC = () => {
  const selection = useSelection()
  if (!selection) {
    return <div className="text-sm text-neutral-500">Select a country, language, or project to view details.</div>
  }
  if (selection.kind === 'region') return <RegionView id={selection.id} />
  if (selection.kind === 'language_entity') return <LanguageEntityView id={selection.id} />
  if (selection.kind === 'project') return <ProjectView id={selection.id} />
  return null
}
// Hierarchy tree section for the active selection
export const HierarchySection: React.FC = () => {
  const selection = useSelection()

  if (!selection) return null

  if (selection.kind === 'language_entity') {
    return <LanguageHierarchy entityId={selection.id} />
  }
  if (selection.kind === 'region') {
    return <RegionHierarchy regionId={selection.id} />
  }
  return null
}

export const LanguageHierarchy: React.FC<{ entityId: string; bare?: boolean }> = ({ entityId, bare }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lang-hier', entityId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_language_entity_hierarchy', {
        entity_id: entityId,
        generations_up: 3,
        generations_down: 3,
      })
      if (error) throw error
      return (data ?? []) as Array<{
        hierarchy_entity_id: string
        hierarchy_entity_name: string
        hierarchy_entity_level: string
        hierarchy_parent_id: string | null
        relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling'
        generation_distance: number
      }>
    },
  })

  const nodesById = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; level: string; parentId: string | null; children: string[] }>()
    for (const r of (data ?? [])) {
      if (!map.has(r.hierarchy_entity_id)) map.set(r.hierarchy_entity_id, { id: r.hierarchy_entity_id, name: r.hierarchy_entity_name, level: r.hierarchy_entity_level, parentId: r.hierarchy_parent_id, children: [] })
    }
    for (const n of map.values()) {
      if (n.parentId && map.has(n.parentId)) map.get(n.parentId)!.children.push(n.id)
    }
    return map
  }, [data])

  if (isLoading) return <TreeSkeleton bare={bare} />
  if (error) return null
  // Root is the top-most ancestor (generation_distance negative min) or self if no ancestors
  const self = data!.find(r => r.relationship_type === 'self')
  const ancestors = data!.filter(r => r.relationship_type === 'ancestor')
  const rootId = ancestors.length > 0 ? ancestors.reduce((min, r) => (r.generation_distance < min.generation_distance ? r : min)).hierarchy_entity_id : self?.hierarchy_entity_id

  if (bare) {
    return <div>{rootId && <Tree id={rootId} nodesById={nodesById} kind="language" />}</div>
  }
  return (
    <div className="mb-2">
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 -mx-3 -mt-3 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <div className="text-xs font-semibold tracking-wide text-neutral-500">Language relationships</div>
      </div>
      <div className="pt-2">
        {rootId && <Tree id={rootId} nodesById={nodesById} kind="language" />}
      </div>
    </div>
  )
}

export const RegionHierarchy: React.FC<{ regionId: string; bare?: boolean }> = ({ regionId, bare }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['region-hier', regionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_region_hierarchy', {
        region_id: regionId,
        generations_up: 3,
        generations_down: 3,
      })
      if (error) throw error
      return (data ?? []) as Array<{
        hierarchy_region_id: string
        hierarchy_region_name: string
        hierarchy_region_level: string
        hierarchy_parent_id: string | null
        relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling'
        generation_distance: number
      }>
    },
  })

  const nodesById = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; level: string; parentId: string | null; children: string[] }>()
    for (const r of (data ?? [])) {
      const id = r.hierarchy_region_id
      if (!map.has(id)) map.set(id, { id, name: r.hierarchy_region_name, level: r.hierarchy_region_level, parentId: r.hierarchy_parent_id, children: [] })
    }
    for (const n of map.values()) {
      if (n.parentId && map.has(n.parentId)) map.get(n.parentId)!.children.push(n.id)
    }
    return map
  }, [data])

  if (isLoading) return <TreeSkeleton bare={bare} />
  if (error) return null
  const self = data!.find(r => r.relationship_type === 'self')
  const ancestors = data!.filter(r => r.relationship_type === 'ancestor')
  const rootId = ancestors.length > 0 ? ancestors.reduce((min, r) => (r.generation_distance < min.generation_distance ? r : min)).hierarchy_region_id : self?.hierarchy_region_id

  if (bare) {
    return <div>{rootId && <Tree id={rootId} nodesById={nodesById} kind="region" />}</div>
  }
  return (
    <div className="mb-2">
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 -mx-3 -mt-3 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <div className="text-xs font-semibold tracking-wide text-neutral-500">Region relationships</div>
      </div>
      <div className="pt-2">
        {rootId && <Tree id={rootId} nodesById={nodesById} kind="region" />}
      </div>
    </div>
  )
}

const Tree: React.FC<{ id: string; nodesById: Map<string, { id: string; name: string; level: string; parentId: string | null; children: string[] }>; kind: 'language' | 'region' }> = ({ id, nodesById, kind }) => {
  const [open, setOpen] = React.useState<Record<string, boolean>>({ [id]: true })
  const navigate = useNavigate()
  const selection = useSelection()

  // Expand all nodes once when nodes change (preserve user toggles afterwards)
  const initializedRef = React.useRef(false)
  React.useEffect(() => {
    initializedRef.current = false
  }, [nodesById])
  React.useEffect(() => {
    if (initializedRef.current) return
    const openAll: Record<string, boolean> = {}
    for (const key of nodesById.keys()) openAll[key] = true
    setOpen(openAll)
    initializedRef.current = true
  }, [nodesById])

  const toggle = (nid: string) => setOpen(o => ({ ...o, [nid]: !o[nid] }))

  const renderNode = (nid: string, depth: number): React.ReactNode => {
    const node = nodesById.get(nid)
    if (!node) return null
    const hasChildren = node.children.length > 0
    const isSelected = !!selection && (
      (kind === 'language' && selection.kind === 'language_entity' && selection.id === nid) ||
      (kind === 'region' && selection.kind === 'region' && selection.id === nid)
    )
    return (
      <div key={nid} className="ml-2">
        <div className="flex items-center gap-2 py-0.5">
          {hasChildren ? (
            <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => toggle(nid)} aria-label={open[nid] ? 'Collapse' : 'Expand'}>
              {open[nid] ? '▾' : '▸'}
            </button>
          ) : (
            <span className="w-5 h-5" />
          )}
          <button
            className={`text-sm underline-offset-2 hover:underline ${isSelected ? 'text-accent-600 font-semibold' : ''}`}
            onClick={() => navigate(kind === 'language' ? `/map/language/${encodeURIComponent(nid)}` : `/map/region/${encodeURIComponent(nid)}`)}
          >
            {node.name}
          </button>
          <span className={`text-xs ${isSelected ? 'text-accent-600' : 'text-neutral-500'}`}>{node.level}</span>
        </div>
        {hasChildren && open[nid] && (
          <div className="ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2">
            {node.children.map(cid => renderNode(cid, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {renderNode(id, 0)}
    </div>
  )
}

export const MapInspectorPanel: React.FC = () => {
  const navigate = useNavigate()
  const selectionForKey = useSelection()
  const selectionKey = selectionForKey ? `${selectionForKey.kind}:${selectionForKey.id}` : 'none'

  const regionHeader = useQuery({
    enabled: !!selectionForKey && selectionForKey.kind === 'region',
    queryKey: ['inspector-header-region', selectionForKey?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('regions').select('id,name,level').eq('id', (selectionForKey as { id: string }).id).single()
      if (error) throw error
      return data as { id: string; name: string; level: string }
    }
  })
  const languageHeader = useQuery({
    enabled: !!selectionForKey && selectionForKey.kind === 'language_entity',
    queryKey: ['inspector-header-language', selectionForKey?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('language_entities').select('id,name,level').eq('id', (selectionForKey as { id: string }).id).single()
      if (error) throw error
      return data as { id: string; name: string; level: string }
    }
  })
  const projectHeader = useQuery({
    enabled: !!selectionForKey && selectionForKey.kind === 'project',
    queryKey: ['inspector-header-project', selectionForKey?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id,name').eq('id', (selectionForKey as { id: string }).id).single()
      if (error) throw error
      return data as { id: string; name: string }
    }
  })

  const isRegion = !!selectionForKey && selectionForKey.kind === 'region'
  const isLanguage = !!selectionForKey && selectionForKey.kind === 'language_entity'
  const isProject = !!selectionForKey && selectionForKey.kind === 'project'
  const isHeaderLoading = (
    (isRegion && (regionHeader.isLoading || (!regionHeader.data && regionHeader.isFetching))) ||
    (isLanguage && (languageHeader.isLoading || (!languageHeader.data && languageHeader.isFetching))) ||
    (isProject && (projectHeader.isLoading || (!projectHeader.data && projectHeader.isFetching)))
  )

  const headerTitle = regionHeader.data?.name || languageHeader.data?.name || projectHeader.data?.name || 'Details'
  const headerSubtitle = selectionForKey ? (selectionForKey.kind === 'language_entity' ? 'LANGUAGE' : selectionForKey.kind.toUpperCase()) : ''

  const headerNode = (
    <FadeSwitch switchKey={selectionKey}>
      {isHeaderLoading ? (
        <HeaderSkeleton onBack={() => navigate(-1)} />
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">←</button>
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">{headerSubtitle}</div>
            <div className="text-lg font-semibold leading-tight">{headerTitle}</div>
          </div>
        </div>
      )}
    </FadeSwitch>
  )

  // Desktop panel
  return (
    <>
      {/* Desktop inspector: grows to content until max height, then scrolls internally */}
      <div className="hidden md:flex flex-col absolute right-4 top-4 w-[420px] max-h-[calc(100dvh-2rem)] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 shadow-xl overflow-hidden">
        <div className="flex-none px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
          {headerNode}
        </div>
        <div className="flex-auto overflow-y-auto p-4">
          {isHeaderLoading ? (
            <BodySkeleton />
          ) : (
            <FadeSwitch switchKey={selectionKey}>
              <PanelBody key={selectionKey} />
            </FadeSwitch>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <MobileBottomSheet header={headerNode}>
        {isHeaderLoading ? (
          <BodySkeleton />
        ) : (
          <FadeSwitch switchKey={selectionKey}>
            <PanelBody key={selectionKey} />
          </FadeSwitch>
        )}
      </MobileBottomSheet>
    </>
  )
}

// Lightweight drag-to-expand bottom sheet with good performance (no heavy deps)
const MobileBottomSheet: React.FC<{ header?: React.ReactNode; children: React.ReactNode }> = ({ header, children }) => {
  const sheetRef = React.useRef<HTMLDivElement | null>(null)
  const initialWindowH = typeof window !== 'undefined' ? window.innerHeight : 800
  const [height, setHeight] = React.useState<number>(() => Math.round(initialWindowH * 0.3))
  const minH = Math.round(initialWindowH * 0.18)
  const midH = Math.round(initialWindowH * 0.6)
  const maxH = Math.round(initialWindowH * 0.92)

  React.useEffect(() => {
    const el = sheetRef.current
    if (!el) return
    let startY = 0
    let startH = height
    const onStart = (e: TouchEvent | MouseEvent) => {
      startY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      startH = height
      window.addEventListener('touchmove', onMove as EventListener, { passive: false })
      window.addEventListener('mousemove', onMove as EventListener)
      window.addEventListener('touchend', onEnd as EventListener)
      window.addEventListener('mouseup', onEnd as EventListener)
    }
    const onMove = (e: TouchEvent | MouseEvent) => {
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      const dy = startY - y
      const next = Math.max(minH, Math.min(maxH, startH + dy))
      setHeight(next)
      if ('preventDefault' in e) e.preventDefault()
    }
    const onEnd = () => {
      // snap
      const targets = [minH, midH, maxH]
      const nearest = targets.reduce((a, b) => (Math.abs(b - height) < Math.abs(a - height) ? b : a))
      setHeight(nearest)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('mouseup', onEnd)
    }
    const handle = el.querySelector('[data-sheet-handle]')
    handle?.addEventListener('touchstart', onStart as EventListener)
    handle?.addEventListener('mousedown', onStart as EventListener)
    return () => {
      handle?.removeEventListener('touchstart', onStart as EventListener)
      handle?.removeEventListener('mousedown', onStart as EventListener)
      window.removeEventListener('touchmove', onMove as EventListener)
      window.removeEventListener('mousemove', onMove as EventListener)
      window.removeEventListener('touchend', onEnd as EventListener)
      window.removeEventListener('mouseup', onEnd as EventListener)
    }
  }, [height, minH, midH, maxH])

  return (
    <div ref={sheetRef} className="md:hidden fixed left-0 right-0 bottom-0 z-20 rounded-t-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl" style={{ height }}>
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
        <div data-sheet-handle className="mx-auto h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        <div className="mt-3">{header}</div>
      </div>
      <div className="p-4 text-sm text-neutral-700 dark:text-neutral-300 max-h-[calc(100%-52px)] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}


