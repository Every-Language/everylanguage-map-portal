import React, { useState, useCallback } from 'react';
import { FormBuilder } from './FormBuilder';
import type { FormSchema, FormField } from './FormBuilder';

export interface DynamicFormProps {
  schema: FormSchema;
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onCancel?: () => void;
  validate?: (values: Record<string, unknown>) => Record<string, string>;
  className?: string;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  schema,
  initialValues = {},
  onSubmit,
  onCancel,
  validate,
  className = ''
}) => {
  // Initialize form values
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const defaultValues: Record<string, unknown> = {};
    
    // Set initial values from schema defaults
    schema.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaultValues[field.name] = field.defaultValue;
      }
    });
    
    // Override with provided initial values
    return { ...defaultValues, ...initialValues };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field validation
  const validateField = useCallback((field: FormField, value: unknown): string | undefined => {
    const validation = field.validation;
    if (!validation) return undefined;

    // Required validation
    if (validation.required && (!value || value === '')) {
      return `${field.label} is required`;
    }

    // String validations
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        return `${field.label} must be at least ${validation.minLength} characters`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `${field.label} must be no more than ${validation.maxLength} characters`;
      }
      if (validation.pattern && !validation.pattern.test(value)) {
        return `${field.label} format is invalid`;
      }
    }

    // Custom validation
    if (validation.custom) {
      return validation.custom(value);
    }

    return undefined;
  }, []);

  // Validate all fields
  const validateForm = useCallback((formValues: Record<string, unknown>): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    
    // Field-level validation
    schema.fields.forEach(field => {
      const error = validateField(field, formValues[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    // Form-level validation
    if (validate) {
      const customErrors = validate(formValues);
      Object.assign(newErrors, customErrors);
    }

    return newErrors;
  }, [schema.fields, validateField, validate]);

  // Handle field changes
  const handleChange = useCallback((name: string, value: unknown) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate field immediately if it was previously invalid
    if (errors[name]) {
      const field = schema.fields.find(f => f.name === name);
      if (field) {
        const error = validateField(field, value);
        setErrors(prev => ({
          ...prev,
          [name]: error || ''
        }));
      }
    }
  }, [errors, schema.fields, validateField]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate entire form
    const formErrors = validateForm(values);
    setErrors(formErrors);
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    schema.fields.forEach(field => {
      allTouched[field.name] = true;
    });
    setTouched(allTouched);
    
    // Submit if no errors
    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Reset functionality could be added here if needed

  // Form methods are available but not exposed in this implementation
  // Could be exposed via React.forwardRef if needed

  return (
    <div className={className}>
      <FormBuilder
        schema={schema}
        values={values}
        errors={errors}
        touched={touched}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}; 