import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Printer, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../../../../shared/design-system/components/Card';
import { Button } from '../../../../shared/design-system/components/Button';
import { Alert, AlertDescription } from '../../../../shared/design-system/components/Alert';
import { useProjectCreation } from '../../hooks/useProjectCreation';
import { useCreateProject } from '../../../../shared/hooks/query/project-mutations';
import { useLanguageEntity } from '../../../../shared/hooks/query/language-entities';
import { useRegion } from '../../../../shared/hooks/query/regions';
import { useAuth } from '../../../auth/hooks/useAuth';

export function ConfirmationStep() {
  const { state, dispatch } = useProjectCreation();
  const { formData } = state;
  const [isPrinting, setIsPrinting] = useState(false);
  const navigate = useNavigate();
  
  const { user, dbUser, loading } = useAuth();
  const createProject = useCreateProject();
  
  // Debug authentication state
  console.log('Auth Debug:', { user, dbUser, loading });
  
  // Fetch language and region details
  const { data: sourceLanguage } = useLanguageEntity(formData.languageSelection.sourceLanguage);
  const { data: targetLanguage } = useLanguageEntity(formData.languageSelection.targetLanguage);
  const { data: region } = useRegion(formData.regionSelection.region);

  const handlePrint = useCallback(() => {
    setIsPrinting(true);
    window.print();
    setIsPrinting(false);
  }, []);

  const handleCreateProject = useCallback(async () => {
    if (loading) {
      dispatch({ type: 'SET_ERROR', payload: 'Please wait while we verify your authentication...' });
      return;
    }

    if (!dbUser) {
      dispatch({ type: 'SET_ERROR', payload: 'Please log in to create a project' });
      return;
    }

    dispatch({ type: 'SET_SUBMITTING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await createProject.mutateAsync({
        name: formData.projectInfo.name,
        description: formData.projectInfo.description,
        source_language_entity_id: formData.languageSelection.sourceLanguage!,
        target_language_entity_id: formData.languageSelection.targetLanguage!,
        region_id: formData.regionSelection.region!,
        created_by: dbUser.id,
      });

      // Project created successfully - navigate to dashboard
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Navigate to dashboard after successful creation
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000); // Small delay to show success message
    } catch (error) {
      console.error('Error creating project:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to create project' 
      });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [formData, dbUser, loading, createProject, dispatch, navigate]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
          Review and Confirm
        </h2>
        <p className="text-neutral-600">
          Please review your project details below and click "Create Project" to proceed.
        </p>
      </div>

      {/* Project Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Project Summary</h3>
              <p className="text-sm text-neutral-600">All information has been validated</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-neutral-900">Project Information</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-600">Name:</span>
                  <span className="ml-2 font-medium">{formData.projectInfo.name}</span>
                </div>
                <div>
                  <span className="text-neutral-600">Description:</span>
                  <p className="ml-2 mt-1 text-neutral-900">{formData.projectInfo.description}</p>
                </div>
              </div>
            </div>

            {/* Language Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-neutral-900">Languages</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-600">Source Language:</span>
                  <span className="ml-2 font-medium">
                    {sourceLanguage ? sourceLanguage.name : 'Loading...'}
                  </span>
                  {sourceLanguage?.level && (
                    <span className="ml-2 text-xs bg-neutral-100 px-2 py-1 rounded">
                      {sourceLanguage.level}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-neutral-600">Target Language:</span>
                  <span className="ml-2 font-medium">
                    {targetLanguage ? targetLanguage.name : 'Loading...'}
                  </span>
                  {targetLanguage?.level && (
                    <span className="ml-2 text-xs bg-neutral-100 px-2 py-1 rounded">
                      {targetLanguage.level}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Region Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-neutral-900">Region</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-600">Selected Region:</span>
                  <span className="ml-2 font-medium">
                    {region ? region.name : 'Loading...'}
                  </span>
                  {region?.level && (
                    <span className="ml-2 text-xs bg-neutral-100 px-2 py-1 rounded">
                      {region.level}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* User Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-neutral-900">Created By</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-600">User:</span>
                  <span className="ml-2 font-medium">
                    {dbUser ? 
                      (dbUser.first_name && dbUser.last_name ? 
                        `${dbUser.first_name} ${dbUser.last_name}` : 
                        dbUser.email
                      ) : 
                      'Not logged in'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-neutral-600">Date:</span>
                  <span className="ml-2 font-medium">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrint}
          disabled={isPrinting || state.isSubmitting}
          leftIcon={<Printer className="w-4 h-4" />}
        >
          {isPrinting ? 'Printing...' : 'Print Summary'}
        </Button>

        <Button
          onClick={handleCreateProject}
          disabled={state.isSubmitting}
          loading={state.isSubmitting}
          size="lg"
        >
          {state.isSubmitting ? 'Creating Project...' : 'Create Project'}
        </Button>
      </div>

      {/* Additional Information */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-medium text-neutral-900">What happens next?</h4>
              <ul className="text-sm text-neutral-600 space-y-1">
                <li>• Your project will be created with the selected languages and region</li>
                <li>• You'll be redirected to the project dashboard</li>
                <li>• You can start uploading audio files for translation</li>
                <li>• Team members can be invited to collaborate</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 