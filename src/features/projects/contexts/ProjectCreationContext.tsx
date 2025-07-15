import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import {
  type ProjectCreationState,
  type ProjectCreationAction,
  initialState,
  validateProjectInfo,
  validateLanguageSelection,
  validateRegionSelection,
} from '../types/projectCreation';

// Reducer
function projectCreationReducer(
  state: ProjectCreationState,
  action: ProjectCreationAction
): ProjectCreationState {
  switch (action.type) {
    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: Math.max(1, Math.min(action.payload, state.steps.length)),
      };

    case 'UPDATE_PROJECT_INFO': {
      const updatedProjectInfo = { ...state.formData.projectInfo, ...action.payload };
      const isValid = validateProjectInfo(updatedProjectInfo);
      
      return {
        ...state,
        formData: {
          ...state.formData,
          projectInfo: updatedProjectInfo,
          isValid: {
            ...state.formData.isValid,
            projectInfo: isValid,
          },
        },
        steps: state.steps.map(step =>
          step.id === 1
            ? { ...step, isValid, isCompleted: isValid }
            : step.id === 2
            ? { ...step, isAccessible: isValid }
            : step
        ),
      };
    }

    case 'SET_LANGUAGE_SELECTION': {
      const isValid = validateLanguageSelection(action.payload);
      
      return {
        ...state,
        formData: {
          ...state.formData,
          languageSelection: action.payload,
          isValid: {
            ...state.formData.isValid,
            languageSelection: isValid,
          },
        },
        steps: state.steps.map(step =>
          step.id === 2
            ? { ...step, isValid, isCompleted: isValid }
            : step.id === 3
            ? { ...step, isAccessible: isValid }
            : step
        ),
      };
    }

    case 'SET_REGION_SELECTION': {
      const updatedRegionSelection = { region: action.payload };
      const isValid = validateRegionSelection(updatedRegionSelection);
      
      return {
        ...state,
        formData: {
          ...state.formData,
          regionSelection: updatedRegionSelection,
          isValid: {
            ...state.formData.isValid,
            regionSelection: isValid,
          },
        },
        steps: state.steps.map(step =>
          step.id === 3
            ? { ...step, isValid, isCompleted: isValid }
            : step.id === 4
            ? { ...step, isAccessible: isValid }
            : step
        ),
      };
    }

    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'RESET_FORM':
      return initialState;

    default:
      return state;
  }
}

// Context
interface ProjectCreationContextType {
  state: ProjectCreationState;
  dispatch: React.Dispatch<ProjectCreationAction>;
  // Helper functions
  canProceedToNext: () => boolean;
  canGoBack: () => boolean;
  isStepAccessible: (stepId: number) => boolean;
  getStepProgress: () => number;
  goToStep: (stepId: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetForm: () => void;
}

export const ProjectCreationContext = createContext<ProjectCreationContextType | undefined>(undefined);

interface ProjectCreationProviderProps {
  children: ReactNode;
}

export function ProjectCreationProvider({ children }: ProjectCreationProviderProps) {
  const [state, dispatch] = useReducer(projectCreationReducer, initialState);

  const canProceedToNext = (): boolean => {
    const currentStep = state.steps.find(step => step.id === state.currentStep);
    return currentStep?.isValid ?? false;
  };

  const canGoBack = (): boolean => {
    return state.currentStep > 1;
  };

  const isStepAccessible = (stepId: number): boolean => {
    if (stepId === 1) return true;
    const step = state.steps.find(s => s.id === stepId);
    return step?.isAccessible ?? false;
  };

  const getStepProgress = (): number => {
    const completedSteps = state.steps.filter(step => step.isCompleted).length;
    return (completedSteps / state.steps.length) * 100;
  };

  const goToStep = (stepId: number): void => {
    if (isStepAccessible(stepId)) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: stepId });
    }
  };

  const nextStep = (): void => {
    if (canProceedToNext()) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStep + 1 });
    }
  };

  const previousStep = (): void => {
    if (canGoBack()) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStep - 1 });
    }
  };

  const resetForm = (): void => {
    dispatch({ type: 'RESET_FORM' });
  };

  const value = {
    state,
    dispatch,
    canProceedToNext,
    canGoBack,
    isStepAccessible,
    getStepProgress,
    goToStep,
    nextStep,
    previousStep,
    resetForm,
  };

  return (
    <ProjectCreationContext.Provider value={value}>
      {children}
    </ProjectCreationContext.Provider>
  );
}



 