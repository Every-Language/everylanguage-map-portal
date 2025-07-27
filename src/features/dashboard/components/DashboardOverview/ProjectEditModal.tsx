import React, { useState, useCallback, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  LoadingSpinner
} from '../../../../shared/design-system';
import { FormLabel } from '../../../../shared/design-system/components/Form';
import { SearchableSelect } from '../../../../shared/design-system/components/Select';
import { useLanguageEntities } from '../../../../shared/hooks/query/language-entities';
import { useRegions } from '../../../../shared/hooks/query/regions';
import { useUpdateProject } from '../../../../shared/hooks/query/project-mutations';
import { useSelectedProject } from '../../hooks/useSelectedProject';
import { useToast } from '../../../../shared/design-system/hooks/useToast';
import type { Project } from '../../../../shared/stores/types';

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

interface FormData {
  name: string;
  description: string;
  sourceLanguageId: string;
  targetLanguageId: string;
  regionId: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  sourceLanguageId?: string;
  targetLanguageId?: string;
  regionId?: string;
  general?: string;
}

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
  isOpen,
  onClose,
  project
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    sourceLanguageId: '',
    targetLanguageId: '',
    regionId: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setSelectedProject } = useSelectedProject();
  const { toast } = useToast();
  const updateProject = useUpdateProject();

  // Data fetching hooks
  const { data: languageEntities = [], isLoading: languagesLoading } = useLanguageEntities();
  const { data: regions = [], isLoading: regionsLoading } = useRegions();

  // Convert data to options for SearchableSelect
  const languageOptions = languageEntities.map(entity => ({
    value: entity.id,
    label: entity.name
  }));

  const regionOptions = regions.map(region => ({
    value: region.id,
    label: region.name
  }));

  // Initialize form data when project changes
  useEffect(() => {
    if (project && isOpen) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        sourceLanguageId: project.source_language_entity_id || '',
        targetLanguageId: project.target_language_entity_id || '',
        regionId: project.region_id || ''
      });
      setErrors({});
    }
  }, [project, isOpen]);

  // Form field handlers
  const handleFieldChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Project name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Project name must be less than 100 characters';
    }

    if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (!formData.sourceLanguageId) {
      newErrors.sourceLanguageId = 'Source language is required';
    }

    if (!formData.targetLanguageId) {
      newErrors.targetLanguageId = 'Target language is required';
    }

    if (formData.sourceLanguageId === formData.targetLanguageId) {
      newErrors.targetLanguageId = 'Target language must be different from source language';
    }

    if (!formData.regionId) {
      newErrors.regionId = 'Region is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !project) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const updatedProject = await updateProject.mutateAsync({
        id: project.id,
        updates: {
          name: formData.name.trim(),
          description: formData.description.trim(),
          source_language_entity_id: formData.sourceLanguageId,
          target_language_entity_id: formData.targetLanguageId,
          region_id: formData.regionId,
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
          <DialogTitle>Edit project metadata</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              {errors.general}
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-2">
            <FormLabel htmlFor="name" className="text-neutral-900 dark:text-neutral-100">Name *</FormLabel>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Enter project name"
              error={errors.name}
              disabled={isSubmitting}
              className="w-full"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <FormLabel htmlFor="description" className="text-neutral-900 dark:text-neutral-100">Description</FormLabel>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Enter project description"
              disabled={isSubmitting}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Source Language */}
          <div className="space-y-2">
            <FormLabel className="text-neutral-900 dark:text-neutral-100">Source Language *</FormLabel>
            <SearchableSelect
              options={languageOptions}
              value={formData.sourceLanguageId}
              onValueChange={(value: string) => handleFieldChange('sourceLanguageId', value)}
              placeholder="Select source language"
              searchPlaceholder="Search languages..."
              disabled={isSubmitting || languagesLoading}
            />
            {errors.sourceLanguageId && (
              <p className="text-sm text-red-600">{errors.sourceLanguageId}</p>
            )}
          </div>

          {/* Target Language */}
          <div className="space-y-2">
            <FormLabel className="text-neutral-900 dark:text-neutral-100">Target Language *</FormLabel>
            <SearchableSelect
              options={languageOptions}
              value={formData.targetLanguageId}
              onValueChange={(value: string) => handleFieldChange('targetLanguageId', value)}
              placeholder="Select target language"
              searchPlaceholder="Search languages..."
              disabled={isSubmitting || languagesLoading}
            />
            {errors.targetLanguageId && (
              <p className="text-sm text-red-600">{errors.targetLanguageId}</p>
            )}
          </div>

          {/* Region */}
          <div className="space-y-2">
            <FormLabel className="text-neutral-900 dark:text-neutral-100">Region *</FormLabel>
            <SearchableSelect
              options={regionOptions}
              value={formData.regionId}
              onValueChange={(value: string) => handleFieldChange('regionId', value)}
              placeholder="Select region"
              searchPlaceholder="Search regions..."
              disabled={isSubmitting || regionsLoading}
            />
            {errors.regionId && (
              <p className="text-sm text-red-600">{errors.regionId}</p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || languagesLoading || regionsLoading}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
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