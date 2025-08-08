import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useCreateProject } from '../../../shared/hooks/query/project-mutations';
import { Button } from '../../../shared/design-system/components/Button';
import { Input } from '../../../shared/design-system/components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/design-system/components/Card';
import { Alert, AlertDescription } from '../../../shared/design-system/components/Alert';
import { LoadingSpinner } from '../../../shared/design-system/components/LoadingSpinner';
import { useToast } from '../../../shared/design-system/hooks/useToast';
import { FuzzySearchSelector, type SearchResultItem } from '../../../shared/components/FuzzySearchSelector';
import type { Project } from '../../../shared/stores/types';

interface ProjectCreationFormProps {
  onProjectCreated: (project: Project) => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
  sourceLanguage: SearchResultItem | null;
  targetLanguage: SearchResultItem | null;
  region: SearchResultItem | null;
}

interface FormErrors {
  name?: string;
  description?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  region?: string;
  general?: string;
}

export const ProjectCreationForm: React.FC<ProjectCreationFormProps> = ({
  onProjectCreated,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    sourceLanguage: null,
    targetLanguage: null,
    region: null
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const createProject = useCreateProject();

  const totalSteps = 3;

  // Form field handlers
  const handleFieldChange = useCallback((field: keyof FormData, value: string | SearchResultItem | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user makes changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Validation for each step
  const validateStep = useCallback((step: number): boolean => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 1:
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
        break;

      case 2:
        if (!formData.sourceLanguage) {
          newErrors.sourceLanguage = 'Source language is required';
        }
        if (!formData.targetLanguage) {
          newErrors.targetLanguage = 'Target language is required';
        }
        if (formData.sourceLanguage && formData.targetLanguage && 
            formData.sourceLanguage.id === formData.targetLanguage.id) {
          newErrors.targetLanguage = 'Target language must be different from source language';
        }
        break;

      case 3:
        if (!formData.region) {
          newErrors.region = 'Region is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  }, [currentStep, validateStep]);

  const handlePrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  // Form submission
  const handleSubmit = useCallback(async () => {
    if (!validateStep(3)) {
      return;
    }

    if (!user) {
      setErrors({ general: 'You must be logged in to create a project' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const newProject = await createProject.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim(),
        source_language_entity_id: formData.sourceLanguage!.id,
        target_language_entity_id: formData.targetLanguage!.id,
        region_id: formData.region!.id,
        created_by: user.id,
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
  }, [formData, validateStep, user, createProject, toast, onProjectCreated]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
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
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Language Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 gap-8">
                <FuzzySearchSelector
                  label="Source Language"
                  placeholder="Search for source language (e.g., English, Spanish)..."
                  selectedItem={formData.sourceLanguage ? {
                    id: formData.sourceLanguage.id,
                    name: formData.sourceLanguage.name,
                    level: formData.sourceLanguage.level
                  } : null}
                  onItemSelect={(item) => handleFieldChange('sourceLanguage', { 
                    id: item.id, 
                    name: item.name, 
                    level: item.level 
                  })}
                  onClear={() => handleFieldChange('sourceLanguage', null)}
                  searchType="language"
                  error={errors.sourceLanguage}
                />

                <FuzzySearchSelector
                  label="Target Language"
                  placeholder="Search for target language (e.g., Swahili, Mandarin)..."
                  selectedItem={formData.targetLanguage ? {
                    id: formData.targetLanguage.id,
                    name: formData.targetLanguage.name,
                    level: formData.targetLanguage.level
                  } : null}
                  onItemSelect={(item) => handleFieldChange('targetLanguage', { 
                    id: item.id, 
                    name: item.name, 
                    level: item.level 
                  })}
                  onClear={() => handleFieldChange('targetLanguage', null)}
                  searchType="language"
                  error={errors.targetLanguage}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Region Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <FuzzySearchSelector
                label="Target Region"
                placeholder="Search for target region (e.g., Africa, Asia, Europe)..."
                selectedItem={formData.region ? {
                  id: formData.region.id,
                  name: formData.region.name,
                  level: formData.region.level
                } : null}
                onItemSelect={(item) => handleFieldChange('region', { 
                  id: item.id, 
                  name: item.name, 
                  level: item.level 
                })}
                onClear={() => handleFieldChange('region', null)}
                searchType="region"
                error={errors.region}
              />
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* General Error */}
      {errors.general && (
        <Alert variant="destructive">
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === currentStep 
                ? 'bg-blue-600 text-white' 
                : step < currentStep 
                  ? 'bg-green-600 text-white' 
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
            }`}>
              {step < currentStep ? '✓' : step}
            </div>
            {step < totalSteps && (
              <div className={`w-8 h-0.5 ${
                step < currentStep ? 'bg-green-600' : 'bg-neutral-200 dark:bg-neutral-700'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Titles */}
      <div className="text-center">
        <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          {currentStep === 1 && 'Project Details'}
          {currentStep === 2 && 'Language Configuration'}
          {currentStep === 3 && 'Region Selection'}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          Step {currentStep} of {totalSteps}
        </p>
      </div>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <div>
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isSubmitting}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
        </div>
        
        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          
          {currentStep < totalSteps ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
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
          )}
        </div>
      </div>
    </div>
  );
}; 