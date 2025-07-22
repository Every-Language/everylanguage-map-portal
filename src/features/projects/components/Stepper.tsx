
import { cn } from '@/shared/design-system/utils';

interface StepperStep {
  id: number;
  name: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isValid: boolean;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  isStepAccessible?: (stepId: number) => boolean;
  className?: string;
}

export function Stepper({ 
  steps, 
  currentStep, 
  onStepClick, 
  isStepAccessible,
  className 
}: StepperProps) {
  const handleStepClick = (stepId: number) => {
    if (onStepClick && isStepAccessible?.(stepId)) {
      onStepClick(stepId);
    }
  };

  return (
    <nav 
      aria-label="Progress"
      className={cn('w-full', className)}
    >
      <ol 
        role="list" 
        className="flex items-center justify-between space-x-2 md:space-x-8"
      >
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isPast = step.id < currentStep;
          const isFuture = step.id > currentStep;
          const isAccessible = isStepAccessible?.(step.id) ?? true;
          const isClickable = onStepClick && isAccessible;

          return (
            <li key={step.id} className="flex-1">
              <div className="flex flex-col items-center">
                {/* Step Circle */}
                <div 
                  className={cn(
                    'relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                    isPast && step.isCompleted && 'bg-green-600 border-green-600 text-white',
                    isPast && !step.isCompleted && 'bg-gray-300 border-gray-300 text-gray-600',
                    isCurrent && step.isValid && 'bg-blue-600 border-blue-600 text-white',
                    isCurrent && !step.isValid && 'bg-white border-blue-600 text-blue-600',
                    isFuture && isAccessible && 'bg-white border-gray-300 text-gray-400 hover:border-gray-400',
                    isFuture && !isAccessible && 'bg-gray-100 border-gray-200 text-gray-300',
                    isClickable && 'cursor-pointer hover:scale-105',
                    !isClickable && 'cursor-default'
                  )}
                  onClick={() => isClickable && handleStepClick(step.id)}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : -1}
                  onKeyDown={(e) => {
                    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleStepClick(step.id);
                    }
                  }}
                  aria-label={`Step ${step.id}: ${step.title}${isCurrent ? ' (current)' : ''}${isPast ? ' (completed)' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isPast && step.isCompleted ? (
                    // Checkmark for completed steps
                    <svg 
                      className="w-5 h-5" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  ) : (
                    // Step number
                    <span className="text-sm font-medium">
                      {step.id}
                    </span>
                  )}

                  {/* Current step indicator */}
                  {isCurrent && (
                    <span className="absolute -inset-1 animate-pulse">
                      <span className="h-full w-full rounded-full bg-blue-400 opacity-25"></span>
                    </span>
                  )}
                </div>

                {/* Step Content */}
                <div className="mt-3 text-center">
                  <div 
                    className={cn(
                      'text-sm font-medium transition-colors duration-200',
                      isCurrent && 'text-blue-600',
                      isPast && 'text-green-600',
                      isFuture && isAccessible && 'text-gray-500',
                      isFuture && !isAccessible && 'text-gray-300'
                    )}
                  >
                    {step.title}
                  </div>
                  
                  {/* Description - only show on larger screens */}
                  <div 
                    className={cn(
                      'hidden md:block mt-1 text-xs transition-colors duration-200',
                      isCurrent && 'text-blue-500',
                      isPast && 'text-green-500',
                      isFuture && isAccessible && 'text-gray-400',
                      isFuture && !isAccessible && 'text-gray-300'
                    )}
                  >
                    {step.description}
                  </div>
                </div>

                {/* Progress Line */}
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      'absolute top-5 left-1/2 w-full h-0.5 -translate-y-1/2 translate-x-6 transition-colors duration-200',
                      'hidden md:block',
                      isPast && step.isCompleted && 'bg-green-600',
                      !isPast && 'bg-gray-200'
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Mobile Progress Bar */}
      <div className="mt-6 md:hidden">
        <div className="flex justify-between text-xs font-medium text-gray-600">
          <span>Step {currentStep} of {steps.length}</span>
          <span>{Math.round(((currentStep - 1) / (steps.length - 1)) * 100)}% Complete</span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${Math.max(0, ((currentStep - 1) / (steps.length - 1)) * 100)}%` 
            }}
          />
        </div>
      </div>
    </nav>
  );
}

// Progress indicator component for use in headers
interface StepProgressProps {
  current: number;
  total: number;
  showPercentage?: boolean;
  className?: string;
}

export function StepProgress({ 
  current, 
  total, 
  showPercentage = false,
  className 
}: StepProgressProps) {
  const percentage = Math.round(((current - 1) / (total - 1)) * 100);
  
  return (
    <div className={cn('w-full', className)}>
      {showPercentage && (
        <div className="flex justify-between text-sm font-medium text-gray-600 mb-2">
          <span>Step {current} of {total}</span>
          <span>{percentage}% Complete</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(0, percentage)}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${percentage}% complete`}
        />
      </div>
    </div>
  );
}

export default Stepper; 