// Types for project creation form
export interface ProjectInfo {
  name: string;
  description: string;
}

export interface LanguageSelection {
  sourceLanguage: string | null;
  targetLanguage: string | null;
}

export interface RegionSelection {
  region: string | null;
}

export interface ProjectCreationFormData {
  projectInfo: ProjectInfo;
  languageSelection: LanguageSelection;
  regionSelection: RegionSelection;
  isValid: {
    projectInfo: boolean;
    languageSelection: boolean;
    regionSelection: boolean;
  };
}

export interface ProjectCreationStep {
  id: number;
  title: string;
  description: string;
  isValid: boolean;
  isCompleted: boolean;
  isAccessible: boolean;
}

export interface ProjectCreationState {
  currentStep: number;
  steps: ProjectCreationStep[];
  formData: ProjectCreationFormData;
  isSubmitting: boolean;
  error: string | null;
}

export type ProjectCreationAction =
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'UPDATE_PROJECT_INFO'; payload: Partial<ProjectInfo> }
  | { type: 'SET_LANGUAGE_SELECTION'; payload: LanguageSelection }
  | { type: 'SET_REGION_SELECTION'; payload: string | null }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_FORM' };

export const initialState: ProjectCreationState = {
  currentStep: 1,
  steps: [
    {
      id: 1,
      title: 'Project Information',
      description: 'Basic project details',
      isValid: false,
      isCompleted: false,
      isAccessible: true,
    },
    {
      id: 2,
      title: 'Language Selection',
      description: 'Choose source and target languages',
      isValid: false,
      isCompleted: false,
      isAccessible: false,
    },
    {
      id: 3,
      title: 'Region Selection',
      description: 'Select target region',
      isValid: false,
      isCompleted: false,
      isAccessible: false,
    },
    {
      id: 4,
      title: 'Confirmation',
      description: 'Review and create project',
      isValid: false,
      isCompleted: false,
      isAccessible: false,
    },
  ],
  formData: {
    projectInfo: {
      name: '',
      description: '',
    },
    languageSelection: {
      sourceLanguage: null,
      targetLanguage: null,
    },
    regionSelection: {
      region: null,
    },
    isValid: {
      projectInfo: false,
      languageSelection: false,
      regionSelection: false,
    },
  },
  isSubmitting: false,
  error: null,
};

// Validation functions
export const validateProjectInfo = (projectInfo: ProjectInfo): boolean => {
  return projectInfo.name.trim().length > 0 && projectInfo.description.trim().length > 0;
};

export const validateLanguageSelection = (languageSelection: LanguageSelection): boolean => {
  return languageSelection.sourceLanguage !== null && languageSelection.targetLanguage !== null;
};

export const validateRegionSelection = (regionSelection: RegionSelection): boolean => {
  return regionSelection.region !== null;
}; 