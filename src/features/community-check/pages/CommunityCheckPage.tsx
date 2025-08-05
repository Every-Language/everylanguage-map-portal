import { useState } from 'react';
import { CommunityCheckTable } from '../components/CommunityCheckTable';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { useAudioPlayerStore } from '../../../shared/stores/audioPlayer';
import { DownloadService } from '../../../shared/services/downloadService';
import type { MediaFileWithVerseInfo } from '../../../shared/hooks/query/media-files';

export default function CommunityCheckPage() {
  const { selectedProject } = useSelectedProject();
  const [selectedFileForChecking, setSelectedFileForChecking] = useState<MediaFileWithVerseInfo | null>(null);
  const { playFile } = useAudioPlayerStore();

  const handleStartChecking = async (file: MediaFileWithVerseInfo) => {
    setSelectedFileForChecking(file);
    
    // Open the file in the global audio player
    if (file.remote_path) {
      try {
        const downloadService = new DownloadService();
        const result = await downloadService.getDownloadUrls([file.remote_path]);
        
        if (result.success && result.urls[file.remote_path]) {
          // Convert the file to the store's expected type - using type assertion since structures are compatible
          playFile(file as import('../../../shared/stores/audioPlayer').MediaFileWithVerseInfo, result.urls[file.remote_path]);
        } else {
          console.error('Failed to get streaming URL');
        }
      } catch (error) {
        console.error('Error getting audio URL:', error);
      }
    }
  };

  if (!selectedProject) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-700 dark:text-yellow-300">
            Please select a project from the sidebar to view community check files.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Community Check</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review and provide feedback on audio files that are ready for community checking.
        </p>
      </div>

      <CommunityCheckTable 
        onStartChecking={handleStartChecking}
        selectedFileId={selectedFileForChecking?.id}
      />
    </div>
  );
} 