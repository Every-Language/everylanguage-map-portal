import React from 'react';
import { FieldBuilder } from './FieldBuilder';
import { ValidationWrapper } from './ValidationWrapper';
import { FormSection } from './FormSection';
import { Button } from '../ui';

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file';
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => string | undefined;
  };
  defaultValue?: unknown;
  section?: string;
  helpText?: string;
  className?: string;
  width?: 'full' | 'half' | 'third' | 'quarter';
}

export interface FormSchema {
  title?: string;
  description?: string;
  fields: FormField[];
  sections?: Array<{
    id: string;
    title: string;
    description?: string;
    collapsible?: boolean;
    defaultExpanded?: boolean;
  }>;
  submitText?: string;
  cancelText?: string;
  layout?: 'single-column' | 'two-column' | 'auto';
}

export interface FormBuilderProps {
  schema: FormSchema;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  onChange: (name: string, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  className?: string;
}

const widthClasses = {
  full: 'col-span-full',
  half: 'col-span-6',
  third: 'col-span-4',
  quarter: 'col-span-3'
};

const layoutClasses = {
  'single-column': 'grid-cols-1',
  'two-column': 'grid-cols-2',
  'auto': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-12'
};

export const FormBuilder: React.FC<FormBuilderProps> = ({
  schema,
  values,
  errors,
  touched,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitDisabled = false,
  className = ''
}) => {
  // Group fields by section
  const fieldsBySection = React.useMemo(() => {
    const grouped: Record<string, FormField[]> = {};
    
    schema.fields.forEach(field => {
      const sectionId = field.section || 'main';
      if (!grouped[sectionId]) {
        grouped[sectionId] = [];
      }
      grouped[sectionId].push(field);
    });
    
    return grouped;
  }, [schema.fields]);

  // Get section configuration
  const getSectionConfig = (sectionId: string) => {
    return schema.sections?.find(s => s.id === sectionId);
  };

  // Validate form
  const isFormValid = React.useMemo(() => {
    return schema.fields.every(field => {
      if (field.required && (!values[field.name] || values[field.name] === '')) {
        return false;
      }
      return !errors[field.name];
    });
  }, [schema.fields, values, errors]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting || submitDisabled) {
      return;
    }
    onSubmit(e);
  };

  const renderField = (field: FormField) => {
    return (
      <ValidationWrapper
        key={field.id}
        error={errors[field.name]}
        touched={touched[field.name]}
        className={`${widthClasses[field.width || 'full']} ${field.className || ''}`}
      >
        <FieldBuilder
          field={field}
          value={values[field.name]}
          onChange={(value: unknown) => onChange(field.name, value)}
          error={errors[field.name]}
          touched={touched[field.name]}
          disabled={field.disabled || isSubmitting}
        />
      </ValidationWrapper>
    );
  };

  const renderSection = (sectionId: string, fields: FormField[]) => {
    const sectionConfig = getSectionConfig(sectionId);
    
    if (sectionId === 'main' && !sectionConfig) {
      // Render main section without wrapper
      return (
        <div 
          key={sectionId}
          className={`grid gap-4 ${layoutClasses[schema.layout || 'auto']}`}
        >
          {fields.map(renderField)}
        </div>
      );
    }

    return (
      <FormSection
        key={sectionId}
        title={sectionConfig?.title || sectionId}
        description={sectionConfig?.description}
        collapsible={sectionConfig?.collapsible}
        defaultExpanded={sectionConfig?.defaultExpanded}
      >
        <div className={`grid gap-4 ${layoutClasses[schema.layout || 'auto']}`}>
          {fields.map(renderField)}
        </div>
      </FormSection>
    );
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Form Header */}
      {(schema.title || schema.description) && (
        <div className="space-y-2">
          {schema.title && (
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {schema.title}
            </h2>
          )}
          {schema.description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {schema.description}
            </p>
          )}
        </div>
      )}

      {/* Form Sections */}
      <div className="space-y-6">
        {Object.entries(fieldsBySection).map(([sectionId, fields]) =>
          renderSection(sectionId, fields)
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {schema.cancelText || 'Cancel'}
          </Button>
        )}
        
        <Button
          type="submit"
          disabled={!isFormValid || isSubmitting || submitDisabled}
          loading={isSubmitting}
        >
          {schema.submitText || 'Submit'}
        </Button>
      </div>
    </form>
  );
}; 