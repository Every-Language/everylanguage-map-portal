import React from 'react'
import { usePartnerOrgData } from '../data/usePartnerOrgData'
import { SelectItem } from '@/shared/components/ui/Select'
import { TitleSelect } from '@/shared/components/ui/TitleSelect'

export const PartnerOrgUpdatesPage: React.FC = () => {
  const data = usePartnerOrgData()
  const [projectId, setProjectId] = React.useState<string>('all')
  const filtered = projectId === 'all' ? data.updates : data.updates.filter(u => data.projects.find(p => p.id === projectId && (u.project?.includes(p.project) || u.language === p.language)))

  return (
    <div className="space-y-6">
      <TitleSelect value={projectId} onValueChange={setProjectId} placeholder="Select project" className="text-xl">
        <SelectItem value="all">All projects</SelectItem>
        {data.projects.map(p => (
          <SelectItem key={p.id} value={p.id}>{`${p.language} • ${p.project} • ${p.version}`}</SelectItem>
        ))}
      </TitleSelect>
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-neutral-200 dark:bg-neutral-800" aria-hidden />
        <div className="space-y-6">
          {filtered.map((u) => (
            <div key={u.id} className="relative pl-10">
              <div className="absolute left-0 top-2 h-6 w-6 rounded-full border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              </div>
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-card">
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                  <div>{u.when} • {u.language} • {u.project}</div>
                </div>
                <div className="text-base font-semibold mb-2">{u.title}</div>
                {/* Media gallery */}
                {Array.isArray((u as any).mediaUrls) && (u as any).mediaUrls.length > 0 ? (
                  <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(u as any).mediaUrls.map((src: string, i: number) => (
                      <img key={i} src={src} alt={`update media ${i + 1}`} className="w-full aspect-video rounded-lg object-cover" />
                    ))}
                  </div>
                ) : u.mediaUrl ? (
                  <div className="mb-3">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    {u.mediaUrl.endsWith('.mp4') ? (
                      <video src={u.mediaUrl} className="w-full aspect-video rounded-lg object-cover" controls />
                    ) : (
                      <img src={u.mediaUrl} alt="update media" className="w-full aspect-video rounded-lg object-cover" />
                    )}
                  </div>
                ) : null}
                <div className="text-sm leading-6 text-neutral-700 dark:text-neutral-300 whitespace-pre-line">{u.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PartnerOrgUpdatesPage


