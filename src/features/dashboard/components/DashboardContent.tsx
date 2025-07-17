import React from 'react'
import { ProjectSelector, useSelectedProject, BibleBooksList } from '../index'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle
} from '../../../shared/design-system'

export const DashboardContent: React.FC = () => {
  const { selectedProject, setSelectedProject } = useSelectedProject()

  return (
    <div className="space-y-8">
      {/* Project Selector Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Select Project
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Choose a project to view its dashboard and manage Bible books
          </p>
        </div>
      </div>
      
      <ProjectSelector
        selectedProject={selectedProject}
        onProjectSelect={setSelectedProject}
        className="max-w-lg"
      />

      {/* Project Dashboard Section */}
      {selectedProject ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedProject.name} Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                {selectedProject.description || 'No description provided'}
              </p>
            </CardContent>
          </Card>
          
          {/* Bible Books List */}
          <BibleBooksList projectId={selectedProject.id} />
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              No Project Selected
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Select a project above to view its dashboard.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 