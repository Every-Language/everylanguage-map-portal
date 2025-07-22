import { useState, useCallback, useMemo } from 'react';

export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

export interface FormActions<T> {
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched: boolean) => void;
  setFormData: (data: Partial<T>) => void;
  setErrors: (errors: Record<string, string>) => void;
  clearErrors: () => void;
  clearForm: () => void;
  resetForm: () => void;
  validateField: (field: keyof T) => boolean;
  validateForm: () => boolean;
  handleSubmit: (onSubmit: (data: T) => Promise<void> | void) => Promise<void>;
}

export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T[keyof T], formData: T) => string | null;
  message?: string;
}

export interface UseFormStateOptions<T> {
  initialData: T;
  validationRules?: ValidationRule<T>[];
  onSubmit?: (data: T) => Promise<void> | void;
  onChange?: (data: T) => void;
  onValidation?: (isValid: boolean, errors: Record<string, string>) => void;
}

export function useFormState<T extends Record<string, unknown>>(
  options: UseFormStateOptions<T>
): FormState<T> & FormActions<T> {
  const {
    initialData,
    validationRules = [],
    onSubmit,
    onChange,
    onValidation,
  } = options;

  const [data, setData] = useState<T>(initialData);
  const [errors, setErrorsState] = useState<Record<string, string>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);
  const isDirty = useMemo(() => {
    return Object.keys(data).some(key => data[key] !== initialData[key]);
  }, [data, initialData]);

  const validateFieldValue = useCallback((field: keyof T, value: T[keyof T], formData: T): string | null => {
    const rule = validationRules.find(r => r.field === field);
    if (!rule) return null;

    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return rule.message || `${String(field)} is required`;
    }

    if (!value) return null;

    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return rule.message || `${String(field)} must be at least ${rule.minLength} characters`;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return rule.message || `${String(field)} must be no more than ${rule.maxLength} characters`;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return rule.message || `${String(field)} is not in valid format`;
      }
    }

    if (rule.custom) {
      return rule.custom(value, formData);
    }

    return null;
  }, [validationRules]);

  const setFieldValue = useCallback((field: keyof T, value: T[keyof T]) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    
    if (touched[String(field)]) {
      const error = validateFieldValue(field, value, newData);
      setErrorsState(prev => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[String(field)] = error;
        } else {
          delete newErrors[String(field)];
        }
        return newErrors;
      });
    }
    
    onChange?.(newData);
  }, [data, touched, validateFieldValue, onChange]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrorsState(prev => ({ ...prev, [String(field)]: error }));
  }, []);

  const setFieldTouched = useCallback((field: keyof T, isTouched: boolean) => {
    setTouchedState(prev => ({ ...prev, [String(field)]: isTouched }));
    
    if (isTouched) {
      const error = validateFieldValue(field, data[field], data);
      if (error) {
        setFieldError(field, error);
      }
    }
  }, [data, validateFieldValue, setFieldError]);

  const setFormData = useCallback((newData: Partial<T>) => {
    const updatedData = { ...data, ...newData };
    setData(updatedData);
    onChange?.(updatedData);
  }, [data, onChange]);

  const setErrors = useCallback((newErrors: Record<string, string>) => {
    setErrorsState(newErrors);
    onValidation?.(Object.keys(newErrors).length === 0, newErrors);
  }, [onValidation]);

  const clearErrors = useCallback(() => {
    setErrorsState({});
    onValidation?.(true, {});
  }, [onValidation]);

  const clearForm = useCallback(() => {
    setData(initialData);
    setErrorsState({});
    setTouchedState({});
  }, [initialData]);

  const resetForm = useCallback(() => {
    clearForm();
  }, [clearForm]);

  const validateField = useCallback((field: keyof T): boolean => {
    const error = validateFieldValue(field, data[field], data);
    if (error) {
      setFieldError(field, error);
      return false;
    } else {
      setErrorsState(prev => {
        const newErrors = { ...prev };
        delete newErrors[String(field)];
        return newErrors;
      });
      return true;
    }
  }, [data, validateFieldValue, setFieldError]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    for (const rule of validationRules) {
      const error = validateFieldValue(rule.field, data[rule.field], data);
      if (error) {
        newErrors[String(rule.field)] = error;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [data, validationRules, validateFieldValue, setErrors]);

  const handleSubmit = useCallback(async (submitHandler: (data: T) => Promise<void> | void) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const allFields = Object.keys(data);
      const touchedState = allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {});
      setTouchedState(touchedState);
      
      if (!validateForm()) {
        return;
      }
      
      const handler = submitHandler || onSubmit;
      if (handler) {
        await handler(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [data, isSubmitting, validateForm, onSubmit]);

  return {
    data,
    errors,
    touched,
    isValid,
    isDirty,
    isSubmitting,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setFormData,
    setErrors,
    clearErrors,
    clearForm,
    resetForm,
    validateField,
    validateForm,
    handleSubmit,
  };
} 