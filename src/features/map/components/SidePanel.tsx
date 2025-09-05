import React from 'react';

interface SidePanelProps {
  onClose?: () => void;
}

export const SidePanel: React.FC<SidePanelProps> = () => {
  const [tab, setTab] = React.useState<'country' | 'language' | 'project'>('country');

  return (
    <>
      {/* Desktop side panel */}
      <div className="hidden md:block map-side-panel">
        <div className="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex gap-2 text-sm">
            <button className={`px-2 py-1 rounded ${tab==='country'?'bg-primary-100 dark:bg-neutral-800':''}`} onClick={() => setTab('country')}>Country</button>
            <button className={`px-2 py-1 rounded ${tab==='language'?'bg-primary-100 dark:bg-neutral-800':''}`} onClick={() => setTab('language')}>Language</button>
            <button className={`px-2 py-1 rounded ${tab==='project'?'bg-primary-100 dark:bg-neutral-800':''}`} onClick={() => setTab('project')}>Project</button>
          </div>
        </div>
        <div className="p-4 text-sm text-neutral-700 dark:text-neutral-300 min-h-[160px]">
          {tab === 'country' && (
            <div>
              <div className="text-lg font-semibold mb-2">Country view</div>
              <p>Placeholder stats and language bubbles go here.</p>
            </div>
          )}
          {tab === 'language' && (
            <div>
              <div className="text-lg font-semibold mb-2">Language view</div>
              <p>Show speakers, countries list, and distribution stats.</p>
            </div>
          )}
          {tab === 'project' && (
            <div>
              <div className="text-lg font-semibold mb-2">Project view</div>
              <p>Show recent completions, progress, and funding summary.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className="md:hidden map-bottom-sheet">
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 mb-2" />
          <div className="flex gap-2 text-sm justify-center">
            <button className={`px-2 py-1 rounded ${tab==='country'?'bg-primary-100 dark:bg-neutral-800':''}`} onClick={() => setTab('country')}>Country</button>
            <button className={`px-2 py-1 rounded ${tab==='language'?'bg-primary-100 dark:bg-neutral-800':''}`} onClick={() => setTab('language')}>Language</button>
            <button className={`px-2 py-1 rounded ${tab==='project'?'bg-primary-100 dark:bg-neutral-800':''}`} onClick={() => setTab('project')}>Project</button>
          </div>
        </div>
        <div className="p-4 text-sm text-neutral-700 dark:text-neutral-300 max-h-[45dvh] overflow-y-auto">
          {tab === 'country' && (
            <div>
              <div className="text-base font-semibold mb-2">Country view</div>
              <p>Placeholder stats and language bubbles go here.</p>
            </div>
          )}
          {tab === 'language' && (
            <div>
              <div className="text-base font-semibold mb-2">Language view</div>
              <p>Show speakers, countries list, and distribution stats.</p>
            </div>
          )}
          {tab === 'project' && (
            <div>
              <div className="text-base font-semibold mb-2">Project view</div>
              <p>Show recent completions, progress, and funding summary.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
