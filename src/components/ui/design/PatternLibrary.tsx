// Pattern Library 模式庫管理組件

import { useState, useEffect } from 'react';
import { Pattern } from '../../../types';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useToast } from '../common/Toast';

export interface PatternLibraryProps {
  className?: string;
  onPatternSelect?: (pattern: Pattern) => void;
  selectedPatternId?: string;
  onPatternEdit?: (pattern: Pattern) => void;
}

interface ExportState {
  loading: boolean;
  error?: string;
  success?: string;
}

interface ImportState {
  loading: boolean;
  error?: string;
  success?: string;
}

export const PatternLibrary: React.FC<PatternLibraryProps> = ({
  className = '',
  onPatternSelect,
  selectedPatternId,
  onPatternEdit
}) => {
  const { appCore } = useBuzzerApp();
  const { showToast } = useToast();

  // 狀態
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set());
  const [exportState, setExportState] = useState<ExportState>({ loading: false });
  const [importState, setImportState] = useState<ImportState>({ loading: false });
  const [importFile, setImportFile] = useState<File | null>(null);

  // 刪除確認
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; patternId: string; patternName: string }>({
    isOpen: false, patternId: '', patternName: ''
  });

  // 載入patterns
  useEffect(() => {
    if (!appCore) return;

    const loadPatterns = () => {
      const allPatterns = appCore.patternManager.getAllPatterns();
      setPatterns(allPatterns);
    };

    loadPatterns();

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
    if (success) {
      showToast('success', '模式已刪除');
    } else {
      showToast('error', '刪除模式失敗');
    }
    setDeleteConfirm({ isOpen: false, patternId: '', patternName: '' });
  };

  // 複製pattern
  const handleDuplicatePattern = async (pattern: Pattern) => {
    if (!appCore) return;

    const duplicatedPattern: Pattern = {
      ...pattern,
      id: `pattern-${Date.now()}`,
      name: `${pattern.name} (副本)`,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };

    const success = await appCore.patternManager.createPattern(duplicatedPattern);
    if (success) {
      showToast('success', '模式已複製');
    } else {
      showToast('error', '複製模式失敗');
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
      setSelectedPatterns(new Set(patterns.map(p => p.id).filter((id): id is string => !!id)));
    }
  };

  // 批量導出
  const handleBatchExport = async () => {
    if (!appCore || selectedPatterns.size === 0) return;

    setExportState({ loading: true });

    try {
      const patternsToExport = patterns.filter(p => p.id && selectedPatterns.has(p.id));
      const currentProfile = appCore.profileManager.getCurrentProfile();
      if (!currentProfile) throw new Error('請先選擇Profile');
      const exported = await appCore.exportEngine.exportPatterns(patternsToExport, currentProfile, { format: 'json', quality: 'high' });

      if (exported) {
        setExportState({ loading: false, success: `成功導出 ${patternsToExport.length} 個模式` });
        showToast('success', `成功導出 ${patternsToExport.length} 個模式`);

        setTimeout(() => {
          setIsExportModalOpen(false);
          setExportState({ loading: false });
          setSelectedPatterns(new Set());
        }, 2000);
      } else {
        throw new Error('導出失敗');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '導出失敗';
      setExportState({ loading: false, error: msg });
      showToast('error', msg);
    }
  };

  // 處理文件選擇
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setImportFile(file);
      setImportState({ loading: false });
    } else {
      setImportState({ loading: false, error: '請選擇JSON文件' });
    }
  };

  // 導入patterns
  const handleImport = async () => {
    if (!importFile || !appCore) return;

    setImportState({ loading: true });

    try {
      const importedCount = await appCore.patternManager.importPatternFromFile(importFile);
      setImportState({ loading: false, success: `成功導入 ${importedCount} 個模式` });
      showToast('success', `成功導入 ${importedCount} 個模式`);
      setImportFile(null);

      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportState({ loading: false });
      }, 2000);

    } catch (error) {
      const msg = error instanceof Error ? error.message : '導入失敗';
      setImportState({ loading: false, error: msg });
      showToast('error', msg);
    }
  };

  // 獲取pattern統計
  const getPatternStats = (pattern: Pattern) => {
    const notes = pattern.notes || [];
    const totalDuration = notes.reduce((sum, note) => sum + note.duration, 0);
    const uniqueNotes = new Set(notes.map(note => `${note.name}${note.octave}`)).size;
    const avgVolume = notes.length > 0 ?
      notes.reduce((sum, note) => sum + (note.volume ?? 0), 0) / notes.length : 0;

    return {
      totalDuration: totalDuration / 1000,
      uniqueNotes,
      avgVolume,
      noteCount: notes.length
    };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 標題和操作區（不重複大標題） */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">模式庫</h3>
        <div className="flex items-center gap-2">
          {selectedPatterns.size > 0 && (
            <Button
              onClick={() => setIsExportModalOpen(true)}
              variant="secondary"
              size="sm"
            >
              導出 ({selectedPatterns.size})
            </Button>
          )}
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="primary"
            size="sm"
          >
            導入
          </Button>
        </div>
      </div>

      {/* 批量操作控制 */}
      {patterns.length > 0 && (
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPatterns.size === patterns.length && patterns.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="ml-2 text-xs text-gray-700">
                全選 ({selectedPatterns.size}/{patterns.length})
              </span>
            </label>

            {selectedPatterns.size > 0 && (
              <Button onClick={() => setSelectedPatterns(new Set())} variant="secondary" size="sm">
                清除
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Pattern列表 */}
      {patterns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="text-gray-400 mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">模式庫為空</h3>
          <p className="text-xs text-gray-600 mb-3">保存或導入音頻模式</p>
          <Button onClick={() => setIsImportModalOpen(true)} variant="primary" size="sm">
            導入模式
          </Button>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
          {patterns.map((pattern) => {
            const isSelected = selectedPatternId === pattern.id;
            const isChecked = pattern.id ? selectedPatterns.has(pattern.id) : false;
            const stats = getPatternStats(pattern);

            return (
              <div
                key={pattern.id}
                className={`
                  bg-white rounded-lg border p-3 transition-all duration-150
                  ${isSelected
                    ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'}
                  cursor-pointer
                `}
                onClick={() => onPatternSelect?.(pattern)}
              >
                <div className="flex items-start gap-3">
                  {/* 選擇框 */}
                  <label className="flex-shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => pattern.id && togglePatternSelection(pattern.id)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 focus:ring-offset-0"
                    />
                  </label>

                  {/* 內容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{pattern.name}</h4>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isSelected && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded">
                            使用中
                          </span>
                        )}
                        {pattern.version && (
                          <span className="text-[10px] text-gray-500">v{pattern.version}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>{stats.noteCount} 音符</span>
                      <span>{stats.totalDuration.toFixed(1)}s</span>
                      <span>{pattern.tempo} BPM</span>
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onPatternEdit?.(pattern)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      title="編輯"
                      aria-label="編輯模式"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDuplicatePattern(pattern)}
                      className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                      title="複製"
                      aria-label="複製模式"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({
                        isOpen: true,
                        patternId: pattern.id || '',
                        patternName: pattern.name
                      })}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="刪除"
                      aria-label="刪除模式"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 刪除確認對話框 */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onConfirm={() => handleDeletePattern(deleteConfirm.patternId)}
        onCancel={() => setDeleteConfirm({ isOpen: false, patternId: '', patternName: '' })}
        title="刪除模式"
        message={`確定要刪除「${deleteConfirm.patternName}」嗎？此操作無法撤銷。`}
        confirmText="刪除"
        variant="danger"
      />

      {/* 批量導出模態框 */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => { setIsExportModalOpen(false); setExportState({ loading: false }); }}
        title="批量導出模式"
        size="md"
        actions={
          <div className="flex space-x-3">
            <Button onClick={() => { setIsExportModalOpen(false); setExportState({ loading: false }); }} variant="secondary">
              取消
            </Button>
            <Button onClick={handleBatchExport} disabled={selectedPatterns.size === 0 || exportState.loading} loading={exportState.loading} variant="primary">
              導出
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">即將導出 {selectedPatterns.size} 個選中的模式為 JSON 文件。</p>
          {exportState.error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <span className="text-sm text-red-800">{exportState.error}</span>
            </div>
          )}
          {exportState.success && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <span className="text-sm text-green-800">{exportState.success}</span>
            </div>
          )}
        </div>
      </Modal>

      {/* 導入模式模態框 */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => { setIsImportModalOpen(false); setImportFile(null); setImportState({ loading: false }); }}
        title="導入模式"
        size="md"
        actions={
          <div className="flex space-x-3">
            <Button onClick={() => { setIsImportModalOpen(false); setImportFile(null); setImportState({ loading: false }); }} variant="secondary">
              取消
            </Button>
            <Button onClick={handleImport} disabled={!importFile || importState.loading} loading={importState.loading} variant="primary">
              導入
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選擇模式文件 (JSON格式)
            </label>
            <input
              type="file" accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>
          {importFile && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-blue-900">{importFile.name}</span>
                <span className="text-sm text-blue-700">({(importFile.size / 1024).toFixed(1)}KB)</span>
              </div>
            </div>
          )}
          {importState.error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <span className="text-sm text-red-800">{importState.error}</span>
            </div>
          )}
          {importState.success && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <span className="text-sm text-green-800">{importState.success}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
