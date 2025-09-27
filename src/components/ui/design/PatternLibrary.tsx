// Pattern Library 模式庫管理組件 - 重構版本

import React, { useState, useEffect } from 'react';
import { Pattern } from '../../../types';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { PatternCard } from './library/PatternCard';
import { BatchOperations } from './library/BatchOperations';
import { ExportModal } from './library/modals/ExportModal';
import { ImportModal } from './library/modals/ImportModal';

export interface PatternLibraryProps {
  className?: string;
  onPatternSelect?: (pattern: Pattern) => void;
  selectedPatternId?: string;
  onPatternEdit?: (pattern: Pattern) => void;
}

export const PatternLibrary: React.FC<PatternLibraryProps> = ({
  className = '',
  onPatternSelect,
  selectedPatternId,
  onPatternEdit
}) => {
  const { appCore } = useBuzzerApp();

  // 狀態
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set());

  // 載入patterns
  useEffect(() => {
    if (!appCore) return;

    const loadPatterns = () => {
      const allPatterns = appCore.patternManager.getAllPatterns();
      setPatterns(allPatterns);
    };

    loadPatterns();

    // 監聽pattern事件
    const handlePatternEvent = () => {
      loadPatterns();
    };

    appCore.patternManager.addEventListener('create', handlePatternEvent);
    appCore.patternManager.addEventListener('update', handlePatternEvent);
    appCore.patternManager.addEventListener('delete', handlePatternEvent);
    appCore.patternManager.addEventListener('import', handlePatternEvent);

    return () => {
      appCore.patternManager.removeEventListener('create', handlePatternEvent);
      appCore.patternManager.removeEventListener('update', handlePatternEvent);
      appCore.patternManager.removeEventListener('delete', handlePatternEvent);
      appCore.patternManager.removeEventListener('import', handlePatternEvent);
    };
  }, [appCore]);

  // 刪除pattern
  const handleDeletePattern = (patternId: string) => {
    if (!appCore) return;

    const success = appCore.patternManager.deletePattern(patternId);
    if (!success) {
      alert('刪除模式失敗');
    }
  };

  // 選擇/取消選擇pattern
  const togglePatternSelection = (patternId: string) => {
    setSelectedPatterns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patternId)) {
        newSet.delete(patternId);
      } else {
        newSet.add(patternId);
      }
      return newSet;
    });
  };

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedPatterns.size === patterns.length) {
      setSelectedPatterns(new Set());
    } else {
      setSelectedPatterns(new Set(patterns.map(p => p.id)));
    }
  };

  // 清除選擇
  const clearSelection = () => {
    setSelectedPatterns(new Set());
  };

  // 導出成功處理
  const handleExportSuccess = () => {
    setSelectedPatterns(new Set());
  };

  // 導入成功處理
  const handleImportSuccess = () => {
    // 重新載入patterns已經通過事件監聽處理
  };

  // 處理複製pattern (從PatternCard傳回)
  const handlePatternDuplicate = (duplicatedPattern: Pattern) => {
    // 重新載入patterns已經通過事件監聽處理
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 標題和操作區 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">模式庫</h2>
          <p className="text-gray-600 mt-1">管理已保存的音頻模式</p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="primary"
            size="sm"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            }
          >
            導入模式
          </Button>
        </div>
      </div>

      {/* 批量操作控制 */}
      <BatchOperations
        patterns={patterns}
        selectedPatterns={selectedPatterns}
        onToggleSelectAll={toggleSelectAll}
        onClearSelection={clearSelection}
        onExportSelected={() => setIsExportModalOpen(true)}
      />

      {/* Pattern列表 */}
      {patterns.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">模式庫為空</h3>
          <p className="text-gray-500 mb-4">還沒有保存任何音頻模式</p>
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="primary"
          >
            導入模式文件
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patterns.map((pattern) => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              isSelected={selectedPatternId === pattern.id}
              isChecked={selectedPatterns.has(pattern.id)}
              onSelect={onPatternSelect || (() => {})}
              onEdit={onPatternEdit || (() => {})}
              onToggleCheck={togglePatternSelection}
              onDuplicate={handlePatternDuplicate}
              onDelete={handleDeletePattern}
            />
          ))}
        </div>
      )}

      {/* 批量導出模態框 */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedPatterns={selectedPatterns}
        patterns={patterns}
        onExportSuccess={handleExportSuccess}
      />

      {/* 導入模式模態框 */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
};