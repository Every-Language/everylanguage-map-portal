import React, { useState, useCallback, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '../../../../shared/design-system/components/Dialog';
import { Button } from '../../../../shared/design-system/components/Button';
import { Input } from '../../../../shared/design-system/components/Input';
import { LoadingSpinner } from '../../../../shared/design-system/components/LoadingSpinner';
import { FormLabel } from '../../../../shared/design-system/components/Form';
import { FuzzySearchSelector, type SearchResultItem } from '../../../../shared/components/FuzzySearchSelector';
import { useUpdateProject } from '../../../../shared/hooks/query/project-mutations';
import { useSelectedProject } from '../../hooks/useSelectedProject';
import { useToast } from '../../../../shared/design-system/hooks/useToast';
import type { Project } from '../../../../shared/stores/types';

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
  isOpen,
  onClose,
  project
}) => {
  const { setSelectedProject } = useSelectedProject();
  const { toast } = useToast();
  const updateProject = useUpdateProject();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sourceLanguage: null as SearchResultItem | null,
    targetLanguage: null as SearchResultItem | null,
    region: null as SearchResultItem | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when project changes
  useEffect(() => {
    if (project && isOpen) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        sourceLanguage: null, // Will be populated if needed
        targetLanguage: null, // Will be populated if needed
        region: null, // Will be populated if needed
      });
      setErrors({});
    }
  }, [project, isOpen]);

  // Form field handlers
  const handleFieldChange = useCallback((field: string, value: string | SearchResultItem | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    }

    if (!formData.sourceLanguage) {
      newErrors.sourceLanguage = 'Source language is required';
    }

    if (!formData.targetLanguage) {
      newErrors.targetLanguage = 'Target language is required';
    }

    if (formData.sourceLanguage?.id === formData.targetLanguage?.id) {
      newErrors.targetLanguage = 'Target language must be different from source language';
    }

    if (!formData.region) {
      newErrors.region = 'Region is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !project) return;

    setIsSubmitting(true);
    
    try {
      const updatedProject = await updateProject.mutateAsync({
        id: project.id,
        updates: {
          name: formData.name.trim(),
          description: formData.description.trim(),
          source_language_entity_id: formData.sourceLanguage?.id || '',
          target_language_entity_id: formData.targetLanguage?.id || '',
          region_id: formData.region?.id || '',
        }
      });

      toast({
        title: 'Project Updated Successfully',
        description: `Project "${formData.name}" has been updated.`,
        variant: 'success',
      });

      // Update the selected project if this is the currently selected one
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }

      onClose();
    } catch (error) {
      console.error('Error updating project:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to update project. Please try again.';
      
      setErrors({ general: errorMessage });
      
      toast({
        title: 'Failed to Update Project',
        description: errorMessage,
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, project, updateProject, toast, setSelectedProject, onClose]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setErrors({});
    onClose();
  }, [isSubmitting, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-2">
            <FormLabel className="text-neutral-900 dark:text-neutral-100">Project Name *</FormLabel>
            <Input
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Enter project name"
              disabled={isSubmitting}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Project Description */}
          <div className="space-y-2">
            <FormLabel className="text-neutral-900 dark:text-neutral-100">Description *</FormLabel>
            <Input
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Enter project description"
              disabled={isSubmitting}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Source Language */}
          <FuzzySearchSelector
            label="Source Language"
            placeholder="Search for source language..."
            selectedItem={formData.sourceLanguage}
            onItemSelect={(item) => handleFieldChange('sourceLanguage', item)}
            onClear={() => handleFieldChange('sourceLanguage', null)}
            searchType="language"
            error={errors.sourceLanguage}
            disabled={isSubmitting}
          />

          {/* Target Language */}
          <FuzzySearchSelector
            label="Target Language"
            placeholder="Search for target language..."
            selectedItem={formData.targetLanguage}
            onItemSelect={(item) => handleFieldChange('targetLanguage', item)}
            onClear={() => handleFieldChange('targetLanguage', null)}
            searchType="language"
            error={errors.targetLanguage}
            disabled={isSubmitting}
          />

          {/* Region */}
          <FuzzySearchSelector
            label="Region"
            placeholder="Search for region..."
            selectedItem={formData.region}
            onItemSelect={(item) => handleFieldChange('region', item)}
            onClear={() => handleFieldChange('region', null)}
            searchType="region"
            error={errors.region}
            disabled={isSubmitting}
          />

          <DialogFooter>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                'Update Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 