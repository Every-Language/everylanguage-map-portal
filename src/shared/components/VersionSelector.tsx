import React from 'react';
import { Card, CardContent, Select, SelectItem, SearchableSelect } from '../design-system';

interface Version {
  id: string;
  name: string;
}

interface VersionSelectorProps {
  // Common props
  title: string;
  description?: string;
  
  // Version selection
  selectedVersionId: string;
  onVersionChange: (versionId: string) => void;
  versions: Version[];
  versionsLoading?: boolean;
  
  // Optional searchable functionality for large lists
  searchable?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  
  // Control "All Versions" option
  allowAllVersions?: boolean;
  
  // Optional additional content
  children?: React.ReactNode;
}

export const VersionSelector: React.FC<VersionSelectorProps> = ({
  title,
  description,
  selectedVersionId,
  onVersionChange,
  versions,
  versionsLoading = false,
  searchable = false,
  placeholder = "Select version",
  searchPlaceholder = "Search versions...",
  allowAllVersions = true,
  children
}) => {
  const versionOptions = [
    ...(allowAllVersions ? [{ value: 'all', label: 'All Versions' }] : []),
    ...(versions?.map(version => ({ value: version.id, label: version.name })) || [])
  ];

  return (
    <Card className="">
      <CardContent className="">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {children}
            
            <div className="min-w-[200px]">
              {searchable ? (
                <SearchableSelect
                  options={versionOptions}
                  value={selectedVersionId}
                  onValueChange={onVersionChange}
                  placeholder={placeholder}
                  searchPlaceholder={searchPlaceholder}
                  disabled={versionsLoading}
                />
              ) : (
                <Select
                  value={selectedVersionId}
                  onValueChange={onVersionChange}
                  disabled={versionsLoading}
                >
                  {allowAllVersions && <SelectItem value="all">All Versions</SelectItem>}
                  {versions?.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      {version.name}
                    </SelectItem>
                  ))}
                </Select>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 