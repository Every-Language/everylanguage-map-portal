import React, { useState, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useCreateProject } from '../../../shared/hooks/query/project-mutations';
import { useLanguageEntities } from '../../../shared/hooks/query/language-entities';
import { useRegions } from '../../../shared/hooks/query/regions';
import { Button } from '../../../shared/design-system/components/Button';
import { Input } from '../../../shared/design-system/components/Input';
import { SearchableSelect } from '../../../shared/design-system/components/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/design-system/components/Card';
import { Alert, AlertDescription } from '../../../shared/design-system/components/Alert';
import { LoadingSpinner } from '../../../shared/design-system/components/LoadingSpinner';
import { useToast } from '../../../shared/design-system/hooks/useToast';
import type { Project } from '../../../shared/stores/types';

interface ProjectCreationFormProps {
  onProjectCreated: (project: Project) => void;
  onCancel: () => void;
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

export const ProjectCreationForm: React.FC<ProjectCreationFormProps> = ({
  onProjectCreated,
  onCancel
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

  const { dbUser } = useAuth();
  const { toast } = useToast();
  const createProject = useCreateProject();

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
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.sourceLanguageId) {
      newErrors.sourceLanguageId = 'Source language is required';
    }

    if (!formData.targetLanguageId) {
      newErrors.targetLanguageId = 'Target language is required';
    }

    if (!formData.regionId) {
      newErrors.regionId = 'Region is required';
    }

    if (formData.sourceLanguageId && formData.targetLanguageId && 
        formData.sourceLanguageId === formData.targetLanguageId) {
      newErrors.targetLanguageId = 'Target language must be different from source language';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!dbUser) {
      setErrors({ general: 'You must be logged in to create a project' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const newProject = await createProject.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim(),
        source_language_entity_id: formData.sourceLanguageId,
        target_language_entity_id: formData.targetLanguageId,
        region_id: formData.regionId,
        created_by: dbUser.id,
      });

      toast({
        title: 'Project Created Successfully',
        description: `Project "${formData.name}" has been created.`,
        variant: 'success',
      });

      onProjectCreated(newProject);
    } catch (error) {
      console.error('Error creating project:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create project. Please try again.';
      
      setErrors({ general: errorMessage });
      
      toast({
        title: 'Failed to Create Project',
        description: errorMessage,
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, dbUser, createProject, toast, onProjectCreated]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Error */}
      {errors.general && (
        <Alert variant="destructive">
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      {/* Project Information */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Project Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Enter project name"
              error={errors.name}
              required
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Describe your project, its purpose, and any specific requirements..."
              className={`w-full min-h-[100px] px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical ${
                errors.description ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600'
              } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
              required
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Language Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Source Language *
              </label>
              {languagesLoading ? (
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-neutral-600">Loading languages...</span>
                </div>
              ) : (
                <SearchableSelect
                  options={languageOptions}
                  value={formData.sourceLanguageId}
                  onValueChange={(value) => handleFieldChange('sourceLanguageId', value)}
                  placeholder="Search and select source language"
                  searchPlaceholder="Search languages..."
                  error={errors.sourceLanguageId}
                />
              )}
              {errors.sourceLanguageId && (
                <p className="text-sm text-red-600 mt-1">{errors.sourceLanguageId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Target Language *
              </label>
              {languagesLoading ? (
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-neutral-600">Loading languages...</span>
                </div>
              ) : (
                <SearchableSelect
                  options={languageOptions}
                  value={formData.targetLanguageId}
                  onValueChange={(value) => handleFieldChange('targetLanguageId', value)}
                  placeholder="Search and select target language"
                  searchPlaceholder="Search languages..."
                  error={errors.targetLanguageId}
                />
              )}
              {errors.targetLanguageId && (
                <p className="text-sm text-red-600 mt-1">{errors.targetLanguageId}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Region Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Region</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Target Region *
            </label>
            {regionsLoading ? (
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-neutral-600">Loading regions...</span>
              </div>
            ) : (
              <SearchableSelect
                options={regionOptions}
                value={formData.regionId}
                onValueChange={(value) => handleFieldChange('regionId', value)}
                placeholder="Search and select target region"
                searchPlaceholder="Search regions..."
                error={errors.regionId}
              />
            )}
            {errors.regionId && (
              <p className="text-sm text-red-600 mt-1">{errors.regionId}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-32"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Creating...
            </>
          ) : (
            'Create Project'
          )}
        </Button>
      </div>
    </form>
  );
}; 