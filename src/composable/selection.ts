import { useState, useRef, useCallback, useEffect } from "react";

export function useSelection() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const lastSelectedItem = useRef<string | null>(null);

  // Auto-exit selection mode when no items are selected
  useEffect(() => {
    if (isSelecting && selectedItems.size === 0) {
      setIsSelecting(false);
    }
  }, [selectedItems.size, isSelecting]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    lastSelectedItem.current = null;
    setIsSelecting(false);
  }, []);

  const toggleItemSelection = useCallback((itemKey: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      lastSelectedItem.current = itemKey;
      return newSet;
    });
  }, []);

  const selectRange = useCallback(
    (start: string, end: string, allItems: string[]) => {
      const startIndex = allItems.indexOf(start);
      const endIndex = allItems.indexOf(end);
      if (startIndex === -1 || endIndex === -1) return;

      const [min, max] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        for (let i = min; i <= max; i++) newSet.add(allItems[i]);
        return newSet;
      });
    },
    []
  );

  // Add individual item selection without toggling selection mode
  const selectItem = useCallback((itemKey: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      newSet.add(itemKey);
      lastSelectedItem.current = itemKey;
      return newSet;
    });
  }, []);

  // Remove individual item selection
  const deselectItem = useCallback((itemKey: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(itemKey);
      return newSet;
    });
  }, []);

  // Force exit selection mode
  const exitSelectionMode = useCallback(() => {
    setIsSelecting(false);
    setSelectedItems(new Set());
    lastSelectedItem.current = null;
  }, []);

  return {
    selectedItems,
    setSelectedItems,
    isSelecting,
    setIsSelecting,
    lastSelectedItem,
    clearSelection,
    toggleItemSelection,
    selectRange,
    selectItem,
    deselectItem,
    exitSelectionMode,
  };
}