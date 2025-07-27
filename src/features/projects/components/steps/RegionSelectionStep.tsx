import React, { useState, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, Search } from 'lucide-react';
import { Button } from '../../../../shared/design-system/components/Button';
import { Input } from '../../../../shared/design-system/components/Input';
import { useRootRegions, useChildRegions, type Region } from '../../../../shared/hooks/query/regions';
import { useProjectCreation } from '../../hooks/useProjectCreation';

interface RegionTreeNodeProps {
  region: Region;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onSelect: (region: Region) => void;
  selectedRegionId: string | null;
  expandedNodes: Set<string>;
}

function RegionTreeNode({
  region,
  level,
  isSelected,
  isExpanded,
  onToggleExpand,
  onSelect,
  selectedRegionId,
  expandedNodes,
}: RegionTreeNodeProps) {
  const { data: childRegions = [], isLoading: isChildrenLoading } = useChildRegions(
    isExpanded ? region.id : null
  );

  const hasChildren = childRegions.length > 0;
  const indentLevel = level * 1.5; // 1.5rem per level

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(region);
    } else if (event.key === 'ArrowRight' && hasChildren && !isExpanded) {
      event.preventDefault();
      onToggleExpand(region.id);
    } else if (event.key === 'ArrowLeft' && isExpanded) {
      event.preventDefault();
      onToggleExpand(region.id);
    }
  }, [region, hasChildren, isExpanded, onToggleExpand, onSelect]);

  const handleSelect = useCallback(() => {
    onSelect(region);
  }, [region, onSelect]);

  const handleToggleExpand = useCallback(() => {
    if (hasChildren) {
      onToggleExpand(region.id);
    }
  }, [region.id, hasChildren, onToggleExpand]);

  return (
    <div className="space-y-1">
      <div
        role="button"
        tabIndex={0}
        className={`group flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer transition-all ${
          isSelected
            ? 'bg-primary-100 text-primary-900 ring-2 ring-primary-500'
            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 dark:hover:text-neutral-200'
        }`}
        style={{ paddingLeft: `${indentLevel}rem` }}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-5 w-5 min-w-0 flex-shrink-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpand();
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-5 h-5 flex-shrink-0" />
        )}

        {/* Region Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{region.name}</span>
            {region.level && (
              <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                {region.level}
              </span>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {isChildrenLoading && (
          <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin flex-shrink-0" />
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="space-y-1">
          {childRegions.map((child) => (
            <RegionTreeNode
              key={child.id}
              region={child}
              level={level + 1}
              isSelected={selectedRegionId === child.id}
              isExpanded={expandedNodes.has(child.id)}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              selectedRegionId={selectedRegionId}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RegionSelectionStep() {
  const { state, dispatch } = useProjectCreation();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Only fetch root regions initially
  const { data: rootRegions = [], isLoading, error } = useRootRegions();
  const selectedRegionId = state.formData.regionSelection.region;

  // Filter regions based on search term
  const filteredRegions = useMemo(() => {
    if (!searchTerm.trim()) {
      return rootRegions;
    }

    return rootRegions.filter(region =>
      region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      region.level?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rootRegions, searchTerm]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleRegionSelect = useCallback((region: Region) => {
    dispatch({
      type: 'SET_REGION_SELECTION',
      payload: region.id,
    });
  }, [dispatch]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  if (error) {
    return (
      <div className="p-4 text-center text-error-600">
        <p>Error loading regions: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
          Region Selection
        </h2>
        <p className="text-neutral-600">
          Choose the geographical region where your translation project will be used.
        </p>
      </div>

      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-neutral-400" />
          </div>
          <Input
            type="text"
            placeholder="Search regions..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              ×
            </Button>
          )}
        </div>

        {/* Region Tree */}
        <div className="max-h-96 overflow-y-auto border border-neutral-200 rounded-lg">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-neutral-600">Loading regions...</p>
            </div>
          ) : filteredRegions.length === 0 ? (
            <div className="p-6 text-center text-neutral-500">
              {searchTerm ? 'No regions found matching your search.' : 'No regions available.'}
            </div>
          ) : (
            <div className="p-2">
              {filteredRegions.map((region) => (
                <RegionTreeNode
                  key={region.id}
                  region={region}
                  level={0}
                  isSelected={selectedRegionId === region.id}
                  isExpanded={expandedNodes.has(region.id)}
                  onToggleExpand={handleToggleExpand}
                  onSelect={handleRegionSelect}
                  selectedRegionId={selectedRegionId}
                  expandedNodes={expandedNodes}
                />
              ))}
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="bg-neutral-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-neutral-900 mb-2">Keyboard Shortcuts</h4>
          <div className="text-xs text-neutral-600 space-y-1">
            <p><kbd className="px-2 py-1 text-xs bg-neutral-200 rounded">Enter</kbd> or <kbd className="px-2 py-1 text-xs bg-neutral-200 rounded">Space</kbd> - Select region</p>
            <p><kbd className="px-2 py-1 text-xs bg-neutral-200 rounded">→</kbd> - Expand node</p>
            <p><kbd className="px-2 py-1 text-xs bg-neutral-200 rounded">←</kbd> - Collapse node</p>
            <p><kbd className="px-2 py-1 text-xs bg-neutral-200 rounded">Tab</kbd> - Navigate between items</p>
          </div>
        </div>
      </div>
    </div>
  );
} 