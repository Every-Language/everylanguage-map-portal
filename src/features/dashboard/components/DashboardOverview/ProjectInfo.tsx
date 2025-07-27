import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, LoadingSpinner, Button } from '../../../../shared/design-system';
import type { ProjectMetadata } from '../../../../shared/hooks/query/dashboard';
import { useSelectedProject } from '../../hooks/useSelectedProject';
import { ProjectEditModal } from './ProjectEditModal';

interface ProjectInfoProps {
  projectMetadata?: ProjectMetadata;
  isLoading: boolean;
}

export const ProjectInfo: React.FC<ProjectInfoProps> = ({
  projectMetadata,
  isLoading
}) => {
  const { selectedProject } = useSelectedProject();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Information</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              disabled={!selectedProject}
            >
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Description
                  </h3>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {projectMetadata?.description || 'No description provided'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Source Language
                  </h3>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {projectMetadata?.sourceLanguage?.name || 'Not specified'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Target Language
                  </h3>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {projectMetadata?.targetLanguage?.name || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Region
                  </h3>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {projectMetadata?.region?.name || 'Not specified'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Team Members
                  </h3>
                  {projectMetadata?.users && projectMetadata.users.length > 0 ? (
                    <div className="space-y-2">
                      {projectMetadata.users.map((userRole, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-neutral-900 dark:text-neutral-100">
                            {userRole.user.first_name} {userRole.user.last_name}
                          </span>
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">
                            {userRole.roles.join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-600 dark:text-neutral-400">No team members found</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Created
                  </h3>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {projectMetadata?.createdAt ? new Date(projectMetadata.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <ProjectEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={selectedProject}
      />
    </>
  );
}; 