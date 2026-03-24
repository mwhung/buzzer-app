// Export Manager 導出管理組件

import { useState, useEffect } from 'react';
import { Pattern } from '../../../types';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

export interface ExportManagerProps {
  className?: string;
  preSelectedPatterns?: Pattern[];
}

interface ExportOptions {
  format: 'wav' | 'json';
  quality: 'high' | 'medium' | 'low';
  includeMetadata: boolean;
  zipOutput: boolean;
}

interface ExportProgress {
  isExporting: boolean;
  currentPattern: number;
  totalPatterns: number;
  currentPatternName: string;
  stage: 'preparing' | 'processing' | 'completing' | 'done';
  error?: string;
  success?: string;
}

export const ExportManager: React.FC<ExportManagerProps> = ({
  className = '',
  preSelectedPatterns = []
}) => {
  const { appCore } = useBuzzerApp();
  const { showToast } = useToast();

  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set());
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'wav',
    quality: 'high',
    includeMetadata: true,
    zipOutput: true
  });
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    isExporting: false,
    currentPattern: 0,
    totalPatterns: 0,
    currentPatternName: '',
    stage: 'preparing'
  });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // 載入patterns
  useEffect(() => {
    if (!appCore) return;

    const loadPatterns = () => {
      const allPatterns = appCore.patternManager.getAllPatterns();
      setPatterns(allPatterns);
    };

    loadPatterns();

    const handlePatternEvent = () => { loadPatterns(); };

    appCore.patternManager.addEventListener('create', handlePatternEvent);
    appCore.patternManager.addEventListener('update', handlePatternEvent);
    appCore.patternManager.addEventListener('delete', handlePatternEvent);

    return () => {
      appCore.patternManager.removeEventListener('create', handlePatternEvent);
      appCore.patternManager.removeEventListener('update', handlePatternEvent);
      appCore.patternManager.removeEventListener('delete', handlePatternEvent);
    };
  }, [appCore]);

  // 預選patterns
  useEffect(() => {
    if (preSelectedPatterns.length > 0) {
      setSelectedPatterns(new Set(preSelectedPatterns.map(p => p.id).filter((id): id is string => !!id)));
    }
  }, [preSelectedPatterns]);

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

  const toggleSelectAll = () => {
    if (selectedPatterns.size === patterns.length) {
      setSelectedPatterns(new Set());
    } else {
      setSelectedPatterns(new Set(patterns.map(p => p.id).filter((id): id is string => !!id)));
    }
  };

  const filterPatterns = (criteria: 'all' | 'with_notes' | 'recent') => {
    let filtered: Pattern[];

    switch (criteria) {
      case 'with_notes':
        filtered = patterns.filter(p => p.notes && p.notes.length > 0);
        break;
      case 'recent': {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filtered = patterns.filter(p => {
          const dateStr = p.updated_at || p.modifiedAt;
          return dateStr ? new Date(dateStr) > oneWeekAgo : false;
        });
        break;
      }
      default:
        filtered = patterns;
    }

    setSelectedPatterns(new Set(filtered.map(p => p.id).filter((id): id is string => !!id)));
  };

  const getExportEstimate = () => {
    const selectedCount = selectedPatterns.size;
    if (selectedCount === 0) return null;

    const selectedPatternList = patterns.filter(p => p.id && selectedPatterns.has(p.id));
    const totalNotes = selectedPatternList.reduce((sum, p) => sum + (p.notes?.length || 0), 0);
    const totalDuration = selectedPatternList.reduce((sum, p) =>
      sum + (p.notes || []).reduce((noteSum, note) => noteSum + note.duration, 0), 0
    );

    let estimatedSize = 0;
    if (exportOptions.format === 'wav') {
      const baseSize = totalDuration / 1000 * 44100 * 2;
      const qualityMultiplier = { high: 2, medium: 1.5, low: 1 }[exportOptions.quality];
      estimatedSize = baseSize * qualityMultiplier;
    } else {
      estimatedSize = totalNotes * 100;
    }

    const estimatedTime = exportOptions.format === 'wav' ?
      (totalDuration / 1000) * 0.5 : selectedCount * 0.1;

    return {
      patterns: selectedCount,
      notes: totalNotes,
      duration: Math.round(totalDuration / 1000),
      size: estimatedSize,
      time: Math.ceil(estimatedTime)
    };
  };

  const startExport = async () => {
    if (!appCore || selectedPatterns.size === 0) return;

    const patternsToExport = patterns.filter(p => p.id && selectedPatterns.has(p.id));

    setExportProgress({
      isExporting: true,
      currentPattern: 0,
      totalPatterns: patternsToExport.length,
      currentPatternName: '',
      stage: 'preparing'
    });
    setIsExportModalOpen(true);

    try {
      for (let i = 0; i < patternsToExport.length; i++) {
        const pattern = patternsToExport[i];

        setExportProgress(prev => ({
          ...prev,
          currentPattern: i + 1,
          currentPatternName: pattern.name,
          stage: 'processing'
        }));

        const currentProfile = appCore.profileManager.getCurrentProfile();
        if (!currentProfile) throw new Error('請先選擇Profile');
        await appCore.exportEngine.exportPatterns([pattern], currentProfile, { format: exportOptions.format, quality: exportOptions.quality });

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setExportProgress(prev => ({ ...prev, stage: 'completing' }));

      if (exportOptions.zipOutput && patternsToExport.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setExportProgress(prev => ({
        ...prev,
        stage: 'done',
        success: `成功導出 ${patternsToExport.length} 個模式`
      }));

      showToast('success', `成功導出 ${patternsToExport.length} 個模式`);

      setTimeout(() => {
        setIsExportModalOpen(false);
        setExportProgress({
          isExporting: false, currentPattern: 0, totalPatterns: 0,
          currentPatternName: '', stage: 'preparing'
        });
        setSelectedPatterns(new Set());
      }, 3000);

    } catch (error) {
      const msg = error instanceof Error ? error.message : '導出失敗';
      setExportProgress(prev => ({ ...prev, isExporting: false, error: msg }));
      showToast('error', msg);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return seconds + ' 秒';
    return Math.floor(seconds / 60) + ' 分 ' + (seconds % 60) + ' 秒';
  };

  const estimate = getExportEstimate();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 快速篩選 — 不重複標題，由 App.tsx 提供 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">快速選擇</h3>
          <span className="text-xs text-gray-600">
            已選中 {selectedPatterns.size} / {patterns.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => filterPatterns('all')} variant="secondary" size="sm">
            全選 ({patterns.length})
          </Button>
          <Button onClick={() => filterPatterns('with_notes')} variant="secondary" size="sm">
            有音符 ({patterns.filter(p => p.notes && p.notes.length > 0).length})
          </Button>
          <Button onClick={() => filterPatterns('recent')} variant="secondary" size="sm">
            最近一週
          </Button>
          <Button onClick={() => setSelectedPatterns(new Set())} variant="secondary" size="sm">
            清除
          </Button>
        </div>
      </Card>

      {/* Pattern列表 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">選擇模式</h3>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selectedPatterns.size === patterns.length && patterns.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="ml-2 text-xs text-gray-700">全選</span>
          </label>
        </div>

        {patterns.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">
              <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-3">沒有可導出的模式</p>
            <p className="text-xs text-gray-600">請先在設計工作台建立音頻模式</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {patterns.map((pattern) => {
              const isSelected = pattern.id ? selectedPatterns.has(pattern.id) : false;
              const totalDuration = (pattern.notes || []).reduce((sum, note) => sum + note.duration, 0);

              return (
                <div
                  key={pattern.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => pattern.id && togglePatternSelection(pattern.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => pattern.id && togglePatternSelection(pattern.id)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 focus:ring-offset-0"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{pattern.name}</h4>
                      {pattern.version && <span className="text-[10px] text-gray-600">v{pattern.version}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-600">
                      <span>{pattern.notes?.length || 0} 音符</span>
                      <span>{(totalDuration / 1000).toFixed(1)}s</span>
                      <span>{pattern.tempo} BPM</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 導出選項 */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">導出選項</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 格式 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">格式</label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio" name="format" value="wav"
                  checked={exportOptions.format === 'wav'}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as 'wav' | 'json' }))}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">WAV 音頻</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio" name="format" value="json"
                  checked={exportOptions.format === 'json'}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as 'wav' | 'json' }))}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">JSON 數據</span>
              </label>
            </div>
          </div>

          {/* 音質 */}
          {exportOptions.format === 'wav' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">音質</label>
              <select
                value={exportOptions.quality}
                onChange={(e) => setExportOptions(prev => ({ ...prev, quality: e.target.value as 'high' | 'medium' | 'low' }))}
                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="high">高品質 (48kHz, 24bit)</option>
                <option value="medium">標準 (44.1kHz, 16bit)</option>
                <option value="low">壓縮 (22kHz, 16bit)</option>
              </select>
            </div>
          )}

          {/* 其他選項 */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-2">其他</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-700">包含元數據</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.zipOutput}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, zipOutput: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-700">打包為 ZIP</span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* 導出預估 */}
      {estimate && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">導出預估</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-gray-900">{estimate.patterns}</div>
              <div className="text-xs text-gray-600">模式</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-gray-900">{estimate.notes}</div>
              <div className="text-xs text-gray-600">音符</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-gray-900">{formatFileSize(estimate.size)}</div>
              <div className="text-xs text-gray-600">預估大小</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-gray-900">{formatTime(estimate.time)}</div>
              <div className="text-xs text-gray-600">預估時間</div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={startExport}
              variant="primary"
              disabled={selectedPatterns.size === 0 || exportProgress.isExporting}
              loading={exportProgress.isExporting}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V8" />
                </svg>
              }
            >
              開始導出 ({selectedPatterns.size})
            </Button>
          </div>
        </Card>
      )}

      {/* 空狀態引導 */}
      {patterns.length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-gray-600">
            返回「設計工作台」建立音頻模式後即可在此導出
          </p>
        </div>
      )}

      {/* 導出進度 */}
      <Modal isOpen={isExportModalOpen} onClose={() => {}} title="導出進度" size="md">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-700">整體進度</span>
              <span className="text-xs text-gray-600">
                {exportProgress.currentPattern} / {exportProgress.totalPatterns}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="progress-bar h-full rounded-full transition-all duration-300"
                style={{ width: `${exportProgress.totalPatterns > 0 ? (exportProgress.currentPattern / exportProgress.totalPatterns) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-3">
              {exportProgress.isExporting && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent flex-shrink-0" />
              )}
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {exportProgress.stage === 'preparing' && '準備導出...'}
                  {exportProgress.stage === 'processing' && `處理: ${exportProgress.currentPatternName}`}
                  {exportProgress.stage === 'completing' && '完成中...'}
                  {exportProgress.stage === 'done' && '導出完成'}
                </div>
              </div>
            </div>
          </div>

          {exportProgress.error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-800">{exportProgress.error}</span>
            </div>
          )}

          {exportProgress.success && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-green-800">{exportProgress.success}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
