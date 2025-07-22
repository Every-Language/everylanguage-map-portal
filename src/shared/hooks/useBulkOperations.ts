import { useState, useCallback, useMemo } from 'react';

export interface BulkOperationsState {
  selectedItems: Set<string>;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  selectedCount: number;
}

export interface BulkOperationsActions<T = unknown> {
  selectItem: (id: string, selected: boolean) => void;
  selectAll: (items: T[], getId?: (item: T) => string) => void;
  clearSelection: () => void;
  toggleSelectAll: (items: T[], getId?: (item: T) => string) => void;
  performBulkOperation: (operation: string, data?: unknown) => Promise<void>;
  setSelectedItems: (items: Set<string>) => void;
}

export interface BulkOperationDefinition {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  confirmMessage?: string;
  handler: (selectedIds: string[], data?: unknown) => Promise<void>;
}

export interface UseBulkOperationsOptions<T = unknown> {
  operations?: BulkOperationDefinition[];
  getId?: (item: T) => string;
  onSelectionChange?: (selectedItems: Set<string>) => void;
  onOperationStart?: (operation: string, selectedIds: string[]) => void;
  onOperationComplete?: (operation: string, selectedIds: string[], result?: unknown) => void;
  onOperationError?: (operation: string, selectedIds: string[], error: Error) => void;
}

export function useBulkOperations<T = unknown>(
  items: T[] = [],
  options: UseBulkOperationsOptions<T> = {}
): BulkOperationsState & BulkOperationsActions<T> {
  const {
    operations = [],
    getId = (item: T) => (item as unknown as { id: string }).id,
    onSelectionChange,
    onOperationStart,
    onOperationComplete,
    onOperationError,
  } = options;

  // State
  const [selectedItems, setSelectedItemsState] = useState<Set<string>>(new Set());

  // Computed state
  const itemIds = useMemo(() => items.map(getId), [items, getId]);
  const isAllSelected = useMemo(() => 
    itemIds.length > 0 && itemIds.every(id => selectedItems.has(id)),
    [itemIds, selectedItems]
  );
  const isSomeSelected = useMemo(() => 
    itemIds.some(id => selectedItems.has(id)),
    [itemIds, selectedItems]
  );
  const selectedCount = selectedItems.size;

  // Actions
  const setSelectedItems = useCallback((items: Set<string>) => {
    setSelectedItemsState(items);
    onSelectionChange?.(items);
  }, [onSelectionChange]);

  const selectItem = useCallback((id: string, selected: boolean) => {
    const newSet = new Set(selectedItems);
    if (selected) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedItems(newSet);
  }, [selectedItems, setSelectedItems]);

  const selectAll = useCallback((items: T[], getIdFn?: (item: T) => string) => {
    const getItemId = getIdFn || getId;
    const allIds = items.map(getItemId);
    setSelectedItems(new Set(allIds));
  }, [getId, setSelectedItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, [setSelectedItems]);

  const toggleSelectAll = useCallback((items: T[], getIdFn?: (item: T) => string) => {
    if (isAllSelected) {
      clearSelection();
    } else {
      selectAll(items, getIdFn);
    }
  }, [isAllSelected, clearSelection, selectAll]);

  const performBulkOperation = useCallback(async (operationId: string, data?: unknown) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation) {
      throw new Error(`Unknown bulk operation: ${operationId}`);
    }

    const selectedIds = Array.from(selectedItems);
    if (selectedIds.length === 0) {
      return;
    }

    // Confirm operation if required
    if (operation.confirmMessage) {
      const confirmed = window.confirm(
        operation.confirmMessage.replace('{count}', selectedIds.length.toString())
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      onOperationStart?.(operationId, selectedIds);
      const result = await operation.handler(selectedIds, data);
      onOperationComplete?.(operationId, selectedIds, result);
      
      // Clear selection after successful operation
      clearSelection();
    } catch (error) {
      onOperationError?.(operationId, selectedIds, error as Error);
      throw error;
    }
  }, [operations, selectedItems, onOperationStart, onOperationComplete, onOperationError, clearSelection]);

  // Computed state object
  const state = useMemo(() => ({
    selectedItems,
    isAllSelected,
    isSomeSelected,
    selectedCount,
  }), [selectedItems, isAllSelected, isSomeSelected, selectedCount]);

  return {
    ...state,
    selectItem,
    selectAll,
    clearSelection,
    toggleSelectAll,
    performBulkOperation,
    setSelectedItems,
  };
} 