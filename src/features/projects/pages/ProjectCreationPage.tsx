import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/shared/design-system/components';
import { ProjectCreationProvider } from '../contexts/ProjectCreationContext';
import { useProjectCreation } from '../hooks/useProjectCreation';
import { Stepper, StepProgress } from '../components/Stepper';
import { useToast } from '@/shared/design-system/hooks/useToast';

// Step components (to be implemented in subsequent subtasks)
import { ProjectInfoStep } from '../components/steps/ProjectInfoStep';
import { LanguageSelectionStep } from '../components/steps/LanguageSelectionStep';
import { RegionSelectionStep } from '../components/steps/RegionSelectionStep';
import { ConfirmationStep } from '../components/steps/ConfirmationStep';

// Main form component that uses the context
function ProjectCreationForm() {
  const {
    state,
    canProceedToNext,
    canGoBack,
    isStepAccessible,
    goToStep,
    nextStep,
    previousStep,
    resetForm,
  } = useProjectCreation();

  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // TODO: Implement actual submission logic
      console.log('Submitting project:', state.formData);
      
      toast({
        title: 'Project Created Successfully',
        description: `Project "${state.formData.projectInfo.name}" has been created.`,
        variant: 'success',
      });
      
      // Navigate to the new project or dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: 'Failed to Create Project',
        description: 'There was an error creating your project. Please try again.',
        variant: 'error',
      });
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Allow user to exit with escape key
        navigate('/dashboard');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Render the current step content
  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 1:
        return <ProjectInfoStep />;
      case 2:
        return <LanguageSelectionStep />;
      case 3:
        return <RegionSelectionStep />;
      case 4:
        return <ConfirmationStep />;
      default:
        return <div>Invalid step</div>;
    }
  };

  const getCurrentStepName = () => {
    const currentStepData = state.steps.find(step => step.id === state.currentStep);
    return currentStepData?.title || 'Unknown Step';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create New Project
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Set up your audio translation project in a few simple steps
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <StepProgress 
            current={state.currentStep} 
            total={state.steps.length}
            showPercentage={true}
            className="mb-4"
          />
        </div>

        {/* Stepper Navigation */}
        <div className="mb-8">
          <Stepper
            steps={state.steps.map(step => ({ ...step, name: step.title }))}
            currentStep={state.currentStep}
            onStepClick={goToStep}
            isStepAccessible={isStepAccessible}
          />
        </div>

        {/* Error Display */}
        {state.error && (
          <Alert variant="error" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                {state.currentStep}
              </span>
              {getCurrentStepName()}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {renderCurrentStep()}
          </CardContent>
        </Card>

        {/* Navigation Controls */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              onClick={resetForm}
              className="text-gray-600 hover:text-gray-900"
              disabled={state.isSubmitting}
            >
              Reset
            </Button>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={!canGoBack() || state.isSubmitting}
            >
              Previous
            </Button>
            
            {state.currentStep < state.steps.length ? (
              <Button
                variant="primary"
                onClick={nextStep}
                disabled={!canProceedToNext() || state.isSubmitting}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!canProceedToNext() || state.isSubmitting}
                loading={state.isSubmitting}
                loadingText="Creating Project..."
              >
                Create Project
              </Button>
            )}
          </div>
        </div>

        {/* Debug Information (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mt-8 bg-gray-50 dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-sm">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(
                  {
                    currentStep: state.currentStep,
                    formData: state.formData,
                    stepValidation: state.formData.isValid,
                    canProceed: canProceedToNext(),
                    canGoBack: canGoBack(),
                  },
                  null,
                  2
                )}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Main page component with context provider
export function ProjectCreationPage() {
  return (
    <ProjectCreationProvider>
      <ProjectCreationForm />
    </ProjectCreationProvider>
  );
}

export default ProjectCreationPage; 