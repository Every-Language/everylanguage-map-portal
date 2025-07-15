import React, { useState } from 'react';
import { Card, CardContent } from '../../../../shared/design-system/components/Card';
import { Button } from '../../../../shared/design-system/components/Button';
import { useProjectCreation } from '../../hooks/useProjectCreation';
import { LanguageTreeView } from '../LanguageTreeView';

export function LanguageSelectionStep() {
  const { state, dispatch } = useProjectCreation();
  const { languageSelection } = state.formData;
  
  const [sourceLanguageModalOpen, setSourceLanguageModalOpen] = useState(false);
  const [targetLanguageModalOpen, setTargetLanguageModalOpen] = useState(false);
  const [selectedSourceLanguage, setSelectedSourceLanguage] = useState<{
    id: string;
    name: string;
    code: string;
  } | null>(null);
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState<{
    id: string;
    name: string;
    code: string;
  } | null>(null);

  const handleSourceLanguageSelect = (language: {
    id: string;
    name: string;
    code: string;
  }) => {
    setSelectedSourceLanguage(language);
    dispatch({
      type: 'SET_LANGUAGE_SELECTION',
      payload: {
        sourceLanguage: language.id,
        targetLanguage: languageSelection.targetLanguage,
      },
    });
    setSourceLanguageModalOpen(false);
  };

  const handleTargetLanguageSelect = (language: {
    id: string;
    name: string;
    code: string;
  }) => {
    setSelectedTargetLanguage(language);
    dispatch({
      type: 'SET_LANGUAGE_SELECTION',
      payload: {
        sourceLanguage: languageSelection.sourceLanguage,
        targetLanguage: language.id,
      },
    });
    setTargetLanguageModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
          Language Selection
        </h2>
        <p className="text-neutral-600">
          Choose the source language you'll be translating from and the target language you'll be translating to.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Language Selection */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-neutral-900">Source Language</h3>
                <p className="text-sm text-neutral-600">
                  The language you'll be translating from
                </p>
              </div>

              {selectedSourceLanguage ? (
                <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary-900">
                        {selectedSourceLanguage.name}
                      </p>
                      <p className="text-sm text-primary-700">
                        {selectedSourceLanguage.code}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSourceLanguageModalOpen(true)}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setSourceLanguageModalOpen(true)}
                  className="w-full"
                >
                  Select Source Language
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Target Language Selection */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-neutral-900">Target Language</h3>
                <p className="text-sm text-neutral-600">
                  The language you'll be translating to
                </p>
              </div>

              {selectedTargetLanguage ? (
                <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-secondary-900">
                        {selectedTargetLanguage.name}
                      </p>
                      <p className="text-sm text-secondary-700">
                        {selectedTargetLanguage.code}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTargetLanguageModalOpen(true)}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setTargetLanguageModalOpen(true)}
                  className="w-full"
                >
                  Select Target Language
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Language Modal */}
      {sourceLanguageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Select Source Language
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSourceLanguageModalOpen(false)}
                >
                  ×
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              <LanguageTreeView
                onLanguageSelect={handleSourceLanguageSelect}
                selectedLanguageId={languageSelection.sourceLanguage}
              />
            </div>
          </div>
        </div>
      )}

      {/* Target Language Modal */}
      {targetLanguageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Select Target Language
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTargetLanguageModalOpen(false)}
                >
                  ×
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              <LanguageTreeView
                onLanguageSelect={handleTargetLanguageSelect}
                selectedLanguageId={languageSelection.targetLanguage}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 