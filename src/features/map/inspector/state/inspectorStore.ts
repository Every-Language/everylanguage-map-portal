import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type MapSelection =
  | { kind: 'language_entity'; id: string }
  | { kind: 'region'; id: string }
  | { kind: 'project'; id: string }

type InspectorState = {
  selection: MapSelection | null
  setSelection: (sel: MapSelection, opts?: { pushRoute?: boolean; focusMap?: boolean }) => void
  clear: () => void
}

type InspectorInternal = {
  // Used by RouteSync to avoid navigation loops
  lastUpdateFromRoute: boolean
  setLastUpdateFromRoute: (v: boolean) => void
}

export const useInspectorStore = create<InspectorState & InspectorInternal>()(
  devtools((set) => ({
    selection: null,
    lastUpdateFromRoute: false,
    setLastUpdateFromRoute: (v: boolean) => set({ lastUpdateFromRoute: v }),
    setSelection: (sel) => set({ selection: sel }),
    clear: () => set({ selection: null }),
  }), { name: 'map-inspector-store' })
)

export const useSelection = () => useInspectorStore(s => s.selection)
export const useSetSelection = () => useInspectorStore(s => s.setSelection)
export const useLastUpdateFromRoute = () => useInspectorStore(s => s.lastUpdateFromRoute)
export const useSetLastUpdateFromRoute = () => useInspectorStore(s => s.setLastUpdateFromRoute)


