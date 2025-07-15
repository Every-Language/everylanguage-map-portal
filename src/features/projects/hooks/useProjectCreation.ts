import { useContext } from 'react';
import { ProjectCreationContext } from '../contexts/ProjectCreationContext';

export function useProjectCreation() {
  const context = useContext(ProjectCreationContext);
  if (!context) {
    throw new Error('useProjectCreation must be used within a ProjectCreationProvider');
  }
  return context;
} 