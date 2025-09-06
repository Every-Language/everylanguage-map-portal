import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelection } from '../state/inspectorStore'
import { LanguageEntityView } from '../views/LanguageEntityView'
import { RegionView } from '../views/RegionView'
import { ProjectView } from '../views/ProjectView'

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

export const MapInspectorPanel: React.FC = () => {
  const navigate = useNavigate()
  const selection = useSelection()
  const selectionKey = selection ? `${selection.kind}:${(selection as { id: string }).id}` : 'none'

  // Desktop panel
  return (
    <>
      {/* Desktop inspector: grows to content until max height, then scrolls internally */}
      <div className="hidden md:flex flex-col absolute right-4 top-4 w-[420px] max-h-[calc(100dvh-2rem)] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 shadow-xl overflow-hidden">
        <div className="flex-none flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex gap-2">
            <button onClick={() => navigate(-1)} className="px-2 py-1 text-sm rounded bg-neutral-100 dark:bg-neutral-800">Back</button>
            <button onClick={() => navigate(1)} className="px-2 py-1 text-sm rounded bg-neutral-100 dark:bg-neutral-800">Forward</button>
          </div>
        </div>
        <AnimatedPanelArea selectionKey={selectionKey}>
          <div className="p-4">
            <PanelBody />
          </div>
        </AnimatedPanelArea>
      </div>

      {/* Mobile bottom sheet */}
      <MobileBottomSheet>
        <PanelBody />
      </MobileBottomSheet>
    </>
  )
}

// Lightweight drag-to-expand bottom sheet with good performance (no heavy deps)
const MobileBottomSheet: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
        <div className="flex gap-2 text-sm justify-center mt-2">
          <button onClick={() => history.back()} className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800">Back</button>
          <button onClick={() => history.forward()} className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800">Forward</button>
        </div>
      </div>
      <div className="p-4 text-sm text-neutral-700 dark:text-neutral-300 max-h-[calc(100%-52px)] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}


