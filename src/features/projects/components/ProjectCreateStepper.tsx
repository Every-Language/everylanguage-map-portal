import React from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '../../../shared/design-system/utils';

export interface StepperStep {
  id: string;
  title: string;
  description: string;
}

export interface ProjectCreateStepperProps {
  steps: StepperStep[];
  currentStep: number;
  stepValidation: Record<number, boolean>;
}

export function ProjectCreateStepper({ steps, currentStep, stepValidation }: ProjectCreateStepperProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isValid = stepValidation[index];
        
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center">
              {/* Step circle */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                  isCompleted || isValid
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : isActive
                    ? 'border-primary-600 text-primary-600 bg-white'
                    : 'border-neutral-300 text-neutral-400 bg-white'
                )}
              >
                {isCompleted || (isActive && isValid) ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              
              {/* Step content */}
              <div className="ml-4 min-w-0">
                <div
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isActive || isCompleted
                      ? 'text-neutral-900'
                      : 'text-neutral-500'
                  )}
                >
                  {step.title}
                </div>
                <div
                  className={cn(
                    'text-xs transition-colors',
                    isActive || isCompleted
                      ? 'text-neutral-600'
                      : 'text-neutral-400'
                  )}
                >
                  {step.description}
                </div>
              </div>
            </div>
            
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-4">
                <div
                  className={cn(
                    'h-0.5 transition-colors',
                    isCompleted || (isActive && isValid)
                      ? 'bg-primary-600'
                      : 'bg-neutral-200'
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 