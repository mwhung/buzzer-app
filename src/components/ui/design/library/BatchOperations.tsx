// Batch Operations 批量操作控制組件

import React from 'react';
import { Pattern } from '../../../../types';
import { Button } from '../../common/Button';

export interface BatchOperationsProps {
  patterns: Pattern[];
  selectedPatterns: Set<string>;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onExportSelected: () => void;
}

export const BatchOperations: React.FC<BatchOperationsProps> = ({
  patterns,
  selectedPatterns,
  onToggleSelectAll,
  onClearSelection,
  onExportSelected
}) => {
  const isAllSelected = selectedPatterns.size === patterns.length && patterns.length > 0;
  const hasSelection = selectedPatterns.size > 0;

  if (patterns.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleSelectAll}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          />
          <span className="ml-2 text-sm text-gray-700">
            全選 ({selectedPatterns.size}/{patterns.length})
          </span>
        </label>

        <div className="flex items-center space-x-3">
          {hasSelection && (
            <>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>已選中 {selectedPatterns.size} 個模式</span>
              </div>

              <Button
                onClick={onExportSelected}
                variant="secondary"
                size="sm"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V8" />
                  </svg>
                }
              >
                導出選中 ({selectedPatterns.size})
              </Button>

              <Button
                onClick={onClearSelection}
                variant="secondary"
                size="sm"
              >
                清除選擇
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};