import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Clock } from 'lucide-react';
import { useProjects } from '../../hooks/query/projects';
import { useLanguageEntities } from '../../hooks/query/language-entities';
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
import type { Project } from '../../stores/types';

interface ProjectWithMetadata extends Project {
  language_name: string;
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

  // Fetch projects and language entities
  const { data: projects = [], isLoading, error } = useProjects();
  const { data: languageEntities = [] } = useLanguageEntities();



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

  // Handle project selection
  const handleProjectSelect = useCallback((project: Project) => {
    onProjectSelect(project);
    updateRecentProjects(project.id);
    onClose();
    setSearchTerm('');
  }, [onProjectSelect, updateRecentProjects, onClose]);

  // Create language lookup map
  const languageLookup = useMemo(() => {
    const map = new Map<string, string>();
    languageEntities.forEach(entity => {
      map.set(entity.id, entity.name);
    });
    return map;
  }, [languageEntities]);

  // Create projects with metadata
  const projectsWithMetadata = useMemo<ProjectWithMetadata[]>(() => {
    return projects.map(project => ({
      ...project,
      language_name: languageLookup.get(project.target_language_entity_id) || 'Unknown',
      progress: 0, // You can calculate this based on your dashboard data
      member_count: 1 // Placeholder - adjust based on your data structure
    }));
  }, [projects, languageLookup]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    const filtered = projectsWithMetadata.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.language_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Sort by recent projects first, then by updated date
    return filtered.sort((a, b) => {
      const aIsRecent = recentProjects.includes(a.id);
      const bIsRecent = recentProjects.includes(b.id);
      
      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;
      
      return getProjectDate(b).getTime() - getProjectDate(a).getTime();
    });
  }, [projectsWithMetadata, searchTerm, recentProjects, getProjectDate]);

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="2xl" className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Project</DialogTitle>
          <DialogDescription>
            Choose a Bible translation project to work on
          </DialogDescription>
        </DialogHeader>

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
              {filteredProjects.map((project) => {
                const isRecent = recentProjects.includes(project.id);
                const isSelected = selectedProject?.id === project.id;
                
                return (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                    }`}
                    onClick={() => handleProjectSelect(project)}
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
                            {isSelected && (
                              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                Current
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            Target Language: {project.language_name}
                          </p>
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
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ml-4">
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 