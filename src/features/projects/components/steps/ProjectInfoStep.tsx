import React from 'react';
import { Form, FormField, FormLabel, FormMessage } from '../../../../shared/design-system/components/Form';
import { Input } from '../../../../shared/design-system/components/Input';
import { useProjectCreation } from '../../hooks/useProjectCreation';

export function ProjectInfoStep() {
  const { state, dispatch } = useProjectCreation();
  const { projectInfo } = state.formData;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'UPDATE_PROJECT_INFO',
      payload: { name: e.target.value },
    });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({
      type: 'UPDATE_PROJECT_INFO',
      payload: { description: e.target.value },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
          Project Information
        </h2>
        <p className="text-neutral-600">
          Let's start by gathering some basic information about your project.
        </p>
      </div>

      <Form className="space-y-6">
        <FormField name="name">
          <FormLabel required>Project Name</FormLabel>
          <Input
            type="text"
            value={projectInfo.name}
            onChange={handleNameChange}
            placeholder="Enter your project name"
            required
          />
          <FormMessage type="info">
            Choose a descriptive name for your translation project.
          </FormMessage>
        </FormField>

        <FormField name="description">
          <FormLabel required>Description</FormLabel>
          <textarea
            value={projectInfo.description}
            onChange={handleDescriptionChange}
            placeholder="Describe your project, its purpose, and any specific requirements..."
            className="w-full min-h-[120px] px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical"
            required
          />
          <FormMessage type="info">
            Provide details about your translation project, target audience, and any specific requirements.
          </FormMessage>
        </FormField>
      </Form>
    </div>
  );
} 