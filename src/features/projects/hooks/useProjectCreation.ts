import { useState, useCallback } from 'react';

export interface ProjectCreationData {
  name: string;
  description: string;
  languageEntityId: string;
  targetLanguageEntityId: string;
}

export function useProjectCreation() {
  const [projectData, setProjectData] = useState<Partial<ProjectCreationData>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProjectData = useCallback((data: Partial<ProjectCreationData>) => {
    setProjectData(prev => ({ ...prev, ...data }));
  }, []);

  const createProject = useCallback(async (data: ProjectCreationData) => {
    setIsCreating(true);
    setError(null);
    
    try {
      // Project creation logic would go here
      console.log('Creating project:', data);
      // Placeholder for actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, projectId: 'temp-id' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsCreating(false);
    }
  }, []);

  const resetForm = useCallback(() => {
    setProjectData({});
    setError(null);
  }, []);

  return {
    projectData,
    isCreating,
    error,
    updateProjectData,
    createProject,
    resetForm,
  };
} 