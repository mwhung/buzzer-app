// 主應用組件 - 使用新的模組化架構

import { useState, useCallback, useMemo } from 'react';
import { WorkflowStages, Note, Pattern } from './types';
import { useBuzzerApp } from './hooks/useBuzzerApp';
import { ErrorBoundary } from './components/ErrorBoundary';

// UI組件導入
import { ProfileManagerUI } from './components/ui/profile/ProfileManagerUI';
import { MusicalBoard } from './components/ui/design/MusicalBoard';
import { PatternEditor } from './components/ui/design/PatternEditor';
import { PatternLibrary } from './components/ui/design/PatternLibrary';
import { PlaybackControls } from './components/ui/playback/PlaybackControls';
import { ExportManager } from './components/ui/export/ExportManager';
import { Button } from './components/ui/common/Button';

import './App.css';

const STAGE_INFO: Record<WorkflowStages, { title: string; description: string }> = {
  [WorkflowStages.PROFILE_MANAGEMENT]: { title: 'Profile 管理', description: '選擇或導入 Buzzer 音頻特性檔案' },
  [WorkflowStages.DESIGN_WORKBENCH]: { title: '設計工作台', description: '使用音樂棋盤和模式編輯器創建音頻序列' },
  [WorkflowStages.EXPORT_MANAGER]: { title: '導出管理', description: '批量選擇和導出音頻模式' },
};

export default function App() {
  const {
    appCore,
    workflowStage,
    currentProfile,
    currentPattern,
    isInitialized,
    goBack,
    goNext
  } = useBuzzerApp();

  // 本地狀態
  const [selectedNotes, setSelectedNotes] = useState<Note[]>([]);
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);

  // 處理音符選擇（從音樂棋盤）
  const handleNoteSelect = useCallback((note: Note) => {
    setEditingPattern(prev => {
      if (!prev || !appCore) return prev;
      return {
        ...prev,
        notes: [...prev.notes, note],
        updated_at: new Date().toISOString()
      };
    });
    setSelectedNotes(prev => [...prev, note]);
  }, [appCore]);

  // 處理模式變更
  const handlePatternChange = useCallback((pattern: Pattern) => {
    setEditingPattern(pattern);
  }, []);

  // 處理模式保存
  const handlePatternSave = useCallback(async (pattern: Pattern) => {
    if (!appCore) return;

    try {
      const success = await appCore.patternManager.createPattern(pattern);
      if (success) {
        setEditingPattern(null);
        setSelectedNotes([]);
      }
    } catch (error) {
      console.error('保存模式失敗:', error);
    }
  }, [appCore]);

  // 處理模式選擇（從庫中）
  const handlePatternSelect = useCallback((pattern: Pattern) => {
    if (appCore && pattern.id) {
      appCore.patternManager.setCurrentPattern(pattern.id);
    }
  }, [appCore]);

  // 處理模式編輯
  const handlePatternEdit = useCallback((pattern: Pattern) => {
    setEditingPattern(pattern);
    setSelectedNotes(pattern.notes || []);
  }, []);

  // 獲取工作流程步驟信息
  const stageInfo = useMemo(() =>
    STAGE_INFO[workflowStage] ?? { title: '未知階段', description: '' },
    [workflowStage]
  );

  // 檢查當前階段是否可以前進
  const canGoNext = useMemo(() => {
    switch (workflowStage) {
      case WorkflowStages.PROFILE_MANAGEMENT:
        return !!currentProfile;
      case WorkflowStages.DESIGN_WORKBENCH:
        return true;
      default:
        return false;
    }
  }, [workflowStage, currentProfile]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">初始化應用中...</h2>
          <p className="text-gray-600">正在載入 Buzzer 應用核心</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* 頂部導航欄 */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* 標題和階段指示器 */}
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-900">Buzzer 設計工作站</h1>

                {/* 工作流程指示器 */}
                <nav className="hidden md:flex items-center space-x-2" aria-label="工作流程步驟">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${workflowStage === WorkflowStages.PROFILE_MANAGEMENT ? 'bg-blue-600' : 'bg-green-500'}`} aria-hidden="true" />
                    <span className={`text-sm ${workflowStage === WorkflowStages.PROFILE_MANAGEMENT ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      Profile
                    </span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${workflowStage === WorkflowStages.DESIGN_WORKBENCH ? 'bg-blue-600' : workflowStage === WorkflowStages.EXPORT_MANAGER ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true" />
                    <span className={`text-sm ${workflowStage === WorkflowStages.DESIGN_WORKBENCH ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      設計
                    </span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${workflowStage === WorkflowStages.EXPORT_MANAGER ? 'bg-blue-600' : 'bg-gray-300'}`} aria-hidden="true" />
                    <span className={`text-sm ${workflowStage === WorkflowStages.EXPORT_MANAGER ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      導出
                    </span>
                  </div>
                </nav>
              </div>

              {/* 工作流程控制按鈕 */}
              <div className="flex items-center space-x-3">
                {workflowStage !== WorkflowStages.PROFILE_MANAGEMENT && (
                  <Button
                    onClick={goBack}
                    variant="secondary"
                    size="sm"
                    aria-label="返回上一步"
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    }
                  >
                    返回
                  </Button>
                )}

                {canGoNext && workflowStage !== WorkflowStages.EXPORT_MANAGER && (
                  <Button
                    onClick={goNext}
                    variant="primary"
                    size="sm"
                    aria-label="前往下一步"
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    }
                  >
                    下一步
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* 主要內容區域 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 階段標題 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{stageInfo.title}</h2>
            <p className="text-gray-600 mt-1">{stageInfo.description}</p>
          </div>

          {/* 根據工作流程階段渲染不同內容 */}
          {workflowStage === WorkflowStages.PROFILE_MANAGEMENT && (
            <ProfileManagerUI />
          )}

          {workflowStage === WorkflowStages.DESIGN_WORKBENCH && (
            <div className="space-y-8">
              {/* 設計工作台頂部 - 快速狀態信息 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {currentProfile?.buzzer_name || '未選擇'}
                    </div>
                    <div className="text-sm text-gray-500">當前 Profile</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {editingPattern?.notes?.length || 0}
                    </div>
                    <div className="text-sm text-gray-500">編輯中音符</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentPattern?.name || '未選擇'}
                    </div>
                    <div className="text-sm text-gray-500">當前模式</div>
                  </div>
                </div>
              </div>

              {/* 音樂棋盤 */}
              <MusicalBoard
                onNoteSelect={handleNoteSelect}
                selectedNotes={selectedNotes}
              />

              {/* 雙欄佈局：模式編輯器 + 模式庫 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 模式編輯器 */}
                <div>
                  <PatternEditor
                    pattern={editingPattern ?? undefined}
                    onPatternChange={handlePatternChange}
                    onSave={handlePatternSave}
                  />
                </div>

                {/* 模式庫 */}
                <div>
                  <PatternLibrary
                    onPatternSelect={handlePatternSelect}
                    selectedPatternId={currentPattern?.id}
                    onPatternEdit={handlePatternEdit}
                  />
                </div>
              </div>

              {/* 播放控制 */}
              <PlaybackControls
                pattern={currentPattern ?? editingPattern ?? undefined}
              />
            </div>
          )}

          {workflowStage === WorkflowStages.EXPORT_MANAGER && (
            <ExportManager />
          )}
        </main>

        {/* 底部狀態欄 */}
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <span>Buzzer 設計工作站 v2.0</span>
                {currentProfile && (
                  <span>Profile: {currentProfile.buzzer_name}</span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span>階段: {stageInfo.title}</span>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true" />
                  <span>{isInitialized ? '已連接' : '未連接'}</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
