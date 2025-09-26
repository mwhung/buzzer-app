// Pattern Library 模式庫管理組件

import React, { useState, useEffect } from 'react';
import { Pattern } from '../../../types';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

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

  // 狀態
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set());
  const [exportState, setExportState] = useState<ExportState>({ loading: false });
  const [importState, setImportState] = useState<ImportState>({ loading: false });
  const [importFile, setImportFile] = useState<File | null>(null);

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

    if (confirm('確定要刪除此模式嗎？此操作無法撤銷。')) {
      const success = appCore.patternManager.deletePattern(patternId);
      if (!success) {
        alert('刪除模式失敗');
      }
    }
  };

  // 複製pattern
  const handleDuplicatePattern = async (pattern: Pattern) => {
    if (!appCore) return;

    const duplicatedPattern: Pattern = {
      ...pattern,
      id: `pattern-${Date.now()}`,
      name: `${pattern.name} (副本)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const success = await appCore.patternManager.createPattern(duplicatedPattern);
    if (!success) {
      alert('複製模式失敗');
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

  // 批量導出
  const handleBatchExport = async () => {
    if (!appCore || selectedPatterns.size === 0) return;

    setExportState({ loading: true });

    try {
      const patternsToExport = patterns.filter(p => selectedPatterns.has(p.id));
      const exported = await appCore.exportEngine.exportPatterns(patternsToExport, 'json');

      if (exported) {
        setExportState({
          loading: false,
          success: `成功導出 ${patternsToExport.length} 個模式`
        });

        setTimeout(() => {
          setIsExportModalOpen(false);
          setExportState({ loading: false });
          setSelectedPatterns(new Set());
        }, 2000);
      } else {
        throw new Error('導出失敗');
      }
    } catch (error) {
      setExportState({
        loading: false,
        error: error instanceof Error ? error.message : '導出失敗'
      });
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
      const importedCount = await appCore.patternManager.importPatternsFromFile(importFile);
      setImportState({
        loading: false,
        success: `成功導入 ${importedCount} 個模式`
      });
      setImportFile(null);

      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportState({ loading: false });
      }, 2000);

    } catch (error) {
      setImportState({
        loading: false,
        error: error instanceof Error ? error.message : '導入失敗'
      });
    }
  };

  // 獲取pattern統計
  const getPatternStats = (pattern: Pattern) => {
    const totalDuration = pattern.notes.reduce((sum, note) => sum + note.duration, 0);
    const uniqueNotes = new Set(pattern.notes.map(note => `${note.name}${note.octave}`)).size;
    const avgVolume = pattern.notes.length > 0 ?
      pattern.notes.reduce((sum, note) => sum + note.volume, 0) / pattern.notes.length : 0;

    return {
      totalDuration: totalDuration / 1000,
      uniqueNotes,
      avgVolume,
      noteCount: pattern.notes.length
    };
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
          {selectedPatterns.size > 0 && (
            <Button
              onClick={() => setIsExportModalOpen(true)}
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
          )}

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
      {patterns.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedPatterns.size === patterns.length && patterns.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                全選 ({selectedPatterns.size}/{patterns.length})
              </span>
            </label>

            {selectedPatterns.size > 0 && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>已選中 {selectedPatterns.size} 個模式</span>
                <Button
                  onClick={() => setSelectedPatterns(new Set())}
                  variant="secondary"
                  size="sm"
                >
                  清除選擇
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

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
          {patterns.map((pattern) => {
            const isSelected = selectedPatternId === pattern.id;
            const isChecked = selectedPatterns.has(pattern.id);
            const stats = getPatternStats(pattern);

            return (
              <Card
                key={pattern.id}
                variant={isSelected ? 'highlighted' : 'default'}
                className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
              >
                <div className="space-y-4">
                  {/* 選擇框和標題 */}
                  <div className="flex items-start justify-between">
                    <label
                      className="flex items-center cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePatternSelection(pattern.id)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-500">選擇</span>
                    </label>

                    {isSelected && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        使用中
                      </span>
                    )}
                  </div>

                  {/* Pattern名稱和信息 */}
                  <div onClick={() => onPatternSelect?.(pattern)}>
                    <h3 className="font-semibold text-gray-900 mb-2">{pattern.name}</h3>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium text-gray-900">{stats.noteCount}</div>
                        <div className="text-gray-500">音符數</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium text-gray-900">{stats.totalDuration.toFixed(1)}s</div>
                        <div className="text-gray-500">時長</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium text-gray-900">{stats.uniqueNotes}</div>
                        <div className="text-gray-500">音符種類</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium text-gray-900">{stats.avgVolume.toFixed(1)}dB</div>
                        <div className="text-gray-500">平均音量</div>
                      </div>
                    </div>

                    {/* 節拍和版本信息 */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                      <span>節拍: {pattern.tempo} BPM</span>
                      <span>v{pattern.version}</span>
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPatternSelect?.(pattern);
                      }}
                      variant={isSelected ? 'success' : 'primary'}
                      size="sm"
                      className="flex-1"
                      disabled={isSelected}
                    >
                      {isSelected ? '已選擇' : '選擇'}
                    </Button>

                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPatternEdit?.(pattern);
                      }}
                      variant="secondary"
                      size="sm"
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      }
                    >
                      編輯
                    </Button>

                    {/* 更多操作下拉菜單 */}
                    <div className="relative group">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        }
                      />

                      {/* 下拉菜單 */}
                      <div className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicatePattern(pattern);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                        >
                          複製
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePattern(pattern.id);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 批量導出模態框 */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => {
          setIsExportModalOpen(false);
          setExportState({ loading: false });
        }}
        title="批量導出模式"
        size="md"
        actions={
          <div className="flex space-x-3">
            <Button
              onClick={() => {
                setIsExportModalOpen(false);
                setExportState({ loading: false });
              }}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              onClick={handleBatchExport}
              disabled={selectedPatterns.size === 0 || exportState.loading}
              loading={exportState.loading}
              variant="primary"
            >
              導出
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            即將導出 {selectedPatterns.size} 個選中的模式為 JSON 文件。
          </p>

          {/* 狀態消息 */}
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
        onClose={() => {
          setIsImportModalOpen(false);
          setImportFile(null);
          setImportState({ loading: false });
        }}
        title="導入模式"
        size="md"
        actions={
          <div className="flex space-x-3">
            <Button
              onClick={() => {
                setIsImportModalOpen(false);
                setImportFile(null);
                setImportState({ loading: false });
              }}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || importState.loading}
              loading={importState.loading}
              variant="primary"
            >
              導入
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* 文件選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選擇模式文件 (JSON格式)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          {/* 選中的文件信息 */}
          {importFile && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-blue-900">{importFile.name}</span>
                <span className="text-sm text-blue-600">({(importFile.size / 1024).toFixed(1)}KB)</span>
              </div>
            </div>
          )}

          {/* 狀態消息 */}
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