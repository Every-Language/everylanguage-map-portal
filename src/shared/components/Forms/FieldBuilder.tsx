import React from 'react';
import { Input, Select, SelectItem, Checkbox } from '../../design-system';
import type { FormField } from './FormBuilder';

export interface FieldBuilderProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
}

export const FieldBuilder: React.FC<FieldBuilderProps> = ({
  field,
  value,
  onChange,
  error,
  touched,
  disabled = false
}) => {
  const hasError = touched && !!error;

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'date':
        return (
          <Input
            type={field.type}
            id={field.id}
            name={field.name}
            placeholder={field.placeholder}
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            disabled={disabled}
            error={hasError ? error : undefined}
            label={field.label}
            helperText={field.helpText}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            id={field.id}
            name={field.name}
            placeholder={field.placeholder}
            value={String(value || '')}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            required={field.required}
            disabled={disabled}
            error={hasError ? error : undefined}
            label={field.label}
            helperText={field.helpText}
          />
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <label
              htmlFor={field.id}
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              id={field.id}
              name={field.name}
              placeholder={field.placeholder}
              value={String(value || '')}
              onChange={(e) => onChange(e.target.value)}
              required={field.required}
              disabled={disabled}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                hasError
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {field.helpText && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {field.helpText}
              </p>
            )}
            {hasError && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <label
              htmlFor={field.id}
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Select
              value={String(value || '')}
              onValueChange={onChange}
              placeholder={field.placeholder || `Select ${field.label}`}
              disabled={disabled}
              error={hasError ? error : undefined}
            >
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
            {field.helpText && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {field.helpText}
              </p>
            )}
            {hasError && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <Checkbox
            id={field.id}
            name={field.name}
            checked={Boolean(value)}
            onCheckedChange={onChange}
            disabled={disabled}
            label={field.label}
            description={field.helpText}
            error={hasError ? error : undefined}
          />
        );

      case 'radio':
        return (
          <div className="space-y-2">
            <fieldset>
              <legend className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </legend>
              <div className="space-y-2">
                {field.options?.map((option) => (
                  <label key={option.value} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name={field.name}
                      value={option.value}
                      checked={value === option.value}
                      onChange={(e) => onChange(e.target.value)}
                      disabled={disabled}
                      className="h-4 w-4 text-blue-600 border-neutral-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {field.helpText && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {field.helpText}
              </p>
            )}
            {hasError && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="space-y-2">
            <label
              htmlFor={field.id}
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="file"
              id={field.id}
              name={field.name}
              onChange={(e) => onChange(e.target.files?.[0] || null)}
              required={field.required}
              disabled={disabled}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                hasError
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-neutral-300 dark:border-neutral-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {field.helpText && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {field.helpText}
              </p>
            )}
            {hasError && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Unsupported field type: {field.type}
            </p>
          </div>
        );
    }
  };

  return <div className="w-full">{renderField()}</div>;
}; 