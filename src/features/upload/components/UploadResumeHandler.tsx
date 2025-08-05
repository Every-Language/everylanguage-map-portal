import { useEffect } from 'react';
import { useUploadStore } from '../../../shared/stores/upload';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';

/**
 * Component that automatically resumes upload tracking when the app loads
 * Should be placed within AuthProvider and ProjectProvider context
 */
export function UploadResumeHandler() {
  const { selectedProject } = useSelectedProject();
  const { resumeUploads, isUploading } = useUploadStore();

  useEffect(() => {
    // Only attempt to resume if we have a selected project and no current uploads
    if (selectedProject?.id && !isUploading) {
      console.log('🔄 App loaded - checking for uploads to resume for project:', selectedProject.id);
      resumeUploads(selectedProject.id);
    }
  }, [selectedProject?.id, resumeUploads, isUploading]);

  // This component doesn't render anything
  return null;
} 