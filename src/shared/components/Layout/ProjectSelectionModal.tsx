import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Clock, Plus } from 'lucide-react';
import { useProjects } from '../../hooks/query/projects';
import { useLanguageEntitiesByIds } from '../../hooks/query/language-entities';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../../design-system/components/Dialog';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { Card } from '../../design-system/components/Card';
import { LoadingSpinner } from '../../design-system/components/LoadingSpinner';
import { Alert, AlertDescription } from '../../design-system/components/Alert';
import { formatDistanceToNow } from 'date-fns';
import { ProjectCreationForm } from '../../../features/projects/components/ProjectCreationForm';
import type { Project } from '../../stores/types';

interface ProjectWithMetadata extends Project {
  target_language_name: string;
  source_language_name: string;
  progress: number;
  member_count: number;
}

interface ProjectSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProject: Project | null;
  onProjectSelect: (project: Project) => void;
}

export const ProjectSelectionModal: React.FC<ProjectSelectionModalProps> = ({
  isOpen,
  onClose,
  selectedProject,
  onProjectSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [currentlySelected, setCurrentlySelected] = useState<Project | null>(selectedProject);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch projects and language entities
  const { data: projects = [], isLoading, error } = useProjects();
  
  // Extract unique language entity IDs from projects
  const languageIds = useMemo(() => {
    const ids = new Set<string>();
    projects.forEach(project => {
      if (project.source_language_entity_id) ids.add(project.source_language_entity_id);
      if (project.target_language_entity_id) ids.add(project.target_language_entity_id);
    });
    return Array.from(ids);
  }, [projects]);
  
  const { data: languageEntities = [], isLoading: languagesLoading } = useLanguageEntitiesByIds(languageIds);

  // Load recent projects from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recent-projects');
    if (recent) {
      try {
        setRecentProjects(JSON.parse(recent));
      } catch {
        setRecentProjects([]);
      }
    }
  }, []);

  // Update recent projects when a project is selected
  const updateRecentProjects = useCallback((projectId: string) => {
    const updated = [projectId, ...recentProjects.filter(id => id !== projectId)].slice(0, 5);
    setRecentProjects(updated);
    localStorage.setItem('recent-projects', JSON.stringify(updated));
  }, [recentProjects]);

  // Helper function to safely parse project dates
  const getProjectDate = useCallback((project: Project): Date => {
    const dateString = project.updated_at || project.created_at;
    return dateString ? new Date(dateString) : new Date();
  }, []);

  // Handle project card click (selection)
  const handleProjectClick = useCallback((project: Project) => {
    setCurrentlySelected(project);
  }, []);

  // Handle final selection confirmation
  const handleConfirmSelection = useCallback(() => {
    if (currentlySelected) {
      onProjectSelect(currentlySelected);
      updateRecentProjects(currentlySelected.id);
      onClose();
      setSearchTerm('');
      setCurrentlySelected(null);
    }
  }, [currentlySelected, onProjectSelect, updateRecentProjects, onClose]);

  // Handle create new project
  const handleCreateProject = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  // Handle project creation success
  const handleProjectCreated = useCallback((newProject: Project) => {
    setShowCreateForm(false);
    onProjectSelect(newProject);
    updateRecentProjects(newProject.id);
    onClose();
    setSearchTerm('');
    setCurrentlySelected(null);
  }, [onProjectSelect, updateRecentProjects, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    setShowCreateForm(false);
    setCurrentlySelected(selectedProject);
    onClose();
  }, [selectedProject, onClose]);

  // Create language lookup map
  const languageLookup = useMemo(() => {
    const map = new Map<string, string>();
    languageEntities.forEach(entity => {
      map.set(entity.id, entity.name);
    });
    
    return map;
  }, [languageEntities]);

  // Enhance projects with metadata
  const projectsWithMetadata = useMemo((): ProjectWithMetadata[] => {
    return projects.map(project => ({
      ...project,
      target_language_name: languagesLoading 
        ? 'Loading...' 
        : languageLookup.get(project.target_language_entity_id) || 'Unknown',
      source_language_name: languagesLoading 
        ? 'Loading...' 
        : languageLookup.get(project.source_language_entity_id) || 'Unknown',
      progress: 0, // TODO: Calculate actual progress
      member_count: 1 // TODO: Get actual member count
    }));
  }, [projects, languageLookup, languagesLoading]);

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projectsWithMetadata;
    
    const term = searchTerm.toLowerCase();
    return projectsWithMetadata.filter(project => 
      project.name.toLowerCase().includes(term) ||
      project.description?.toLowerCase().includes(term) ||
      project.target_language_name.toLowerCase().includes(term) ||
      project.source_language_name.toLowerCase().includes(term)
    );
  }, [projectsWithMetadata, searchTerm]);

  // Sort projects: recent first, then by updated date
  const sortedProjects = useMemo(() => {
    const recent = filteredProjects.filter(p => recentProjects.includes(p.id));
    const others = filteredProjects.filter(p => !recentProjects.includes(p.id));
    
    // Sort recent projects by their position in recentProjects array
    recent.sort((a, b) => recentProjects.indexOf(a.id) - recentProjects.indexOf(b.id));
     
    // Sort other projects by updated date
    others.sort((a, b) => {
      const aDate = getProjectDate(a).getTime();
      const bDate = getProjectDate(b).getTime();
      return bDate - aDate;
    });
     
    return [...recent, ...others];
  }, [filteredProjects, recentProjects, getProjectDate]);

  // If showing create form, render it instead
  if (showCreateForm) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && setShowCreateForm(false)}>
        <DialogContent size="5xl" className="max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Set up your Bible translation project with the required information
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <ProjectCreationForm
              onProjectCreated={handleProjectCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent size="2xl" className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Project</DialogTitle>
          <DialogDescription>
            Choose a Bible translation project to work on or create a new one
          </DialogDescription>
        </DialogHeader>

        {/* Create New Project Button */}
        <div className="pb-4 border-b">
          <Button
            onClick={handleCreateProject}
            className="w-full justify-center"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Project
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <Input
            placeholder="Search projects by name, language, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-sm text-neutral-500">Loading projects...</span>
            </div>
          ) : error ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Error loading projects: {error.message}
                </AlertDescription>
              </Alert>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
              {searchTerm ? 'No projects found matching your search.' : 'No projects found.'}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedProjects.map((project) => {
                const isRecent = recentProjects.includes(project.id);
                const isSelected = currentlySelected?.id === project.id;
                const isCurrentProject = selectedProject?.id === project.id;
                
                return (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 ring-2 ring-blue-500/20' 
                        : 'hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                    onClick={() => handleProjectClick(project)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                              {project.name}
                            </h3>
                            {isRecent && (
                              <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                                <Clock className="w-3 h-3 mr-1" />
                                Recent
                              </div>
                            )}
                            {isCurrentProject && (
                              <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                Current
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 mt-1">
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              Source: {project.source_language_name} → Target: {project.target_language_name}
                            </p>
                          </div>
                          {project.description && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <span>
                              Updated {formatDistanceToNow(getProjectDate(project), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          
          <Button 
            onClick={handleConfirmSelection}
            disabled={!currentlySelected}
            className="min-w-24"
          >
            Select
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 