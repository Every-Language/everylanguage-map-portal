import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { 
  useLanguagesProgressiveSearch,
  type LanguageSearchResult 
} from '../hooks/query/language-entities';
import { 
  useRegionsProgressiveSearch,
  type RegionSearchResult 
} from '../hooks/query/regions';
import { Button } from '../design-system/components/Button';
import { Input } from '../design-system/components/Input';

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Search result item interface
export interface SearchResultItem {
  id: string;
  name: string;
  level?: string;
  similarity?: number;
  alias?: string;
  regions?: Array<{ id: string; name: string; level: string }>;
}

// Enhanced Fuzzy Search Component with Table Results
interface FuzzySearchSelectorProps {
  placeholder: string;
  label: string;
  selectedItem: SearchResultItem | null;
  onItemSelect: (item: SearchResultItem) => void;
  onClear?: () => void;
  searchType: 'language' | 'region';
  error?: string;
  disabled?: boolean;
}

export function FuzzySearchSelector({
  placeholder,
  label,
  selectedItem,
  onItemSelect,
  onClear,
  searchType,
  error,
  disabled = false
}: FuzzySearchSelectorProps) {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Longer debounce for auto-search (1 second)
  const debouncedQuery = useDebounce(query, 1000);
  
  // Only auto-search if query is longer than 3 characters
  const shouldAutoSearch = debouncedQuery.length >= 4;
  const shouldSearch = hasSearched || shouldAutoSearch;
  
  // Use the appropriate search hook
  const languageSearch = useLanguagesProgressiveSearch(debouncedQuery, 
    searchType === 'language' && debouncedQuery.length >= 2 && shouldSearch
  );
  const regionSearch = useRegionsProgressiveSearch(debouncedQuery, 
    searchType === 'region' && debouncedQuery.length >= 2 && shouldSearch
  );
  
  const searchResults = searchType === 'language' ? languageSearch : regionSearch;
  
  // Transform results to common format
  const transformedResults: SearchResultItem[] = searchResults.data?.results?.map((result: LanguageSearchResult | RegionSearchResult) => ({
    id: searchType === 'language' ? (result as LanguageSearchResult).entity_id : (result as RegionSearchResult).region_id,
    name: searchType === 'language' ? (result as LanguageSearchResult).entity_name : (result as RegionSearchResult).region_name,
    level: searchType === 'language' ? (result as LanguageSearchResult).entity_level : (result as RegionSearchResult).region_level,
    similarity: result.alias_similarity_score,
    alias: result.alias_name !== (searchType === 'language' ? (result as LanguageSearchResult).entity_name : (result as RegionSearchResult).region_name) ? result.alias_name : undefined,
    // Handle the new JSONB regions structure for languages
    regions: searchType === 'language' 
      ? (result as LanguageSearchResult).regions?.map(region => ({
          id: region.region_id,
          name: region.region_name,
          level: region.region_level
        })) || []
      : undefined
  })) || [];

  const handleItemSelect = (item: SearchResultItem) => {
    onItemSelect(item);
    setQuery('');
    setHasSearched(false);
  };

  const handleClear = () => {
    setQuery('');
    setHasSearched(false);
    onClear?.();
    inputRef.current?.focus();
  };

  // Manual search trigger
  const handleSearch = () => {
    if (query.length >= 2) {
      setHasSearched(true);
    }
  };

  // Handle Enter key for search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Reset search state when query changes
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (hasSearched && e.target.value !== debouncedQuery) {
      setHasSearched(false);
    }
  };

  const getLevelDisplayName = (level?: string) => {
    return level?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          {label} *
        </label>
        
        {selectedItem ? (
          <div className={`flex items-center justify-between p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-900/20 ${
            error ? 'border-red-500' : 'border-blue-200 dark:border-blue-700'
          }`}>
            <div className="flex items-center space-x-3">
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  {selectedItem.name}
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  {getLevelDisplayName(selectedItem.level)}
                  {selectedItem.similarity && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      ({Math.round(selectedItem.similarity * 100)}% match)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              ✕
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative flex">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={disabled}
                  className={`pl-10 pr-20 ${error ? 'border-red-500' : ''}`}
                />
              </div>
              <Button
                type="button"
                onClick={handleSearch}
                disabled={query.length < 2 || disabled}
                size="sm"
                className="ml-2 px-4"
              >
                Search
              </Button>
            </div>

            {/* Help text */}
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {query.length < 2 
                ? `Type at least 2 characters, then press Enter or click Search`
                : query.length >= 4 
                  ? `Auto-searching... or click Search for immediate results`
                  : `Press Enter or click Search to find results`
              }
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </div>

      {/* Search Results Table */}
      {!selectedItem && debouncedQuery.length >= 2 && shouldSearch && !disabled && (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
          {searchResults.isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin mr-3" />
              <span className="text-neutral-600 dark:text-neutral-400">Searching for {searchType}s...</span>
            </div>
          ) : searchResults.error ? (
            <div className="p-6 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center text-red-600 dark:text-red-400 mb-2">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="font-medium">Search failed</span>
              </div>
              <div className="text-sm text-red-600/80 dark:text-red-400/80">
                {searchResults.error.message}
              </div>
              <div className="text-xs text-red-600/60 dark:text-red-400/60 mt-1">
                Make sure the search functions exist in your database
              </div>
            </div>
          ) : transformedResults.length === 0 ? (
            <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-800/50">
              <div className="text-neutral-600 dark:text-neutral-400">
                No {searchType}s found for "{debouncedQuery}"
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
                Try a different search term or check your spelling
              </div>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {searchType === 'language' ? 'Language' : 'Region'}
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Level
                    </th>
                    <th className="text-center p-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Match
                    </th>
                    {searchType === 'language' && (
                      <th className="text-left p-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Regions
                      </th>
                    )}
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {transformedResults.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
                      onClick={() => handleItemSelect(item)}
                    >
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                              {item.name}
                            </div>
                            {item.alias && item.alias !== item.name && (
                              <div className="text-xs text-blue-600 dark:text-blue-400">
                                Also known as: "{item.alias}"
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400 capitalize">
                          {getLevelDisplayName(item.level)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {Math.round((item.similarity || 0) * 100)}%
                        </span>
                      </td>
                      {searchType === 'language' && (
                        <td className="p-3">
                          {item.regions && item.regions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.regions.slice(0, 3).map((region) => (
                                <span
                                  key={region.id}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                >
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {region.name}
                                </span>
                              ))}
                              {item.regions.length > 3 && (
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                  +{item.regions.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">
                              No associations configured
                            </span>
                          )}
                        </td>
                      )}
                      <td className="p-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Select
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Search metadata */}
          {searchResults.data?.metadata && transformedResults.length > 0 && (
            <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
                <span>
                  Found {transformedResults.length} {searchType}s
                </span>
                <span>
                  Similarity threshold: {Math.round(searchResults.data.metadata.thresholdUsed * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 