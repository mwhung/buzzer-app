// 主應用組件 - 使用新的模組化架構

import { useState, useCallback, useMemo } from 'react';
import { WorkflowStages, Note, Pattern } from './types';
import { useBuzzerApp } from './hooks/useBuzzerApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/common/Toast';

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

const STAGES = [
  { key: WorkflowStages.PROFILE_MANAGEMENT, label: 'Profile', shortLabel: '1' },
  { key: WorkflowStages.DESIGN_WORKBENCH, label: '設計', shortLabel: '2' },
  { key: WorkflowStages.EXPORT_MANAGER, label: '導出', shortLabel: '3' },
];

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
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');

  // 處理音符選擇
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

  // 移除單個已選音符
  const handleNoteRemove = useCallback((index: number) => {
    setSelectedNotes(prev => prev.filter((_, i) => i !== index));
    setEditingPattern(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        notes: prev.notes.filter((_, i) => i !== index),
        updated_at: new Date().toISOString()
      };
    });
  }, []);

  // 清空已選音符
  const handleNotesClear = useCallback(() => {
    setSelectedNotes([]);
    setEditingPattern(prev => {
      if (!prev) return prev;
      return { ...prev, notes: [], updated_at: new Date().toISOString() };
    });
  }, []);

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

  // 處理模式選擇
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

  // 帶過渡動畫的導航
  const handleGoBack = useCallback(() => {
    setTransitionDirection('left');
    goBack();
  }, [goBack]);

  const handleGoNext = useCallback(() => {
    setTransitionDirection('right');
    goNext();
  }, [goNext]);

  // 可點擊的步驟導航
  const handleStageClick = useCallback((targetStage: WorkflowStages) => {
    if (targetStage === workflowStage) return;

    // 只允許跳到已完成或當前的階段
    const stageOrder = [WorkflowStages.PROFILE_MANAGEMENT, WorkflowStages.DESIGN_WORKBENCH, WorkflowStages.EXPORT_MANAGER];
    const currentIndex = stageOrder.indexOf(workflowStage);
    const targetIndex = stageOrder.indexOf(targetStage);

    // Profile 必須先選擇才能跳到後面的階段
    if (targetIndex > 0 && !currentProfile) return;

    setTransitionDirection(targetIndex > currentIndex ? 'right' : 'left');

    // 透過多次 goBack/goNext 導航到目標階段
    if (targetIndex < currentIndex) {
      for (let i = 0; i < currentIndex - targetIndex; i++) {
        goBack();
      }
    } else {
      for (let i = 0; i < targetIndex - currentIndex; i++) {
        goNext();
      }
    }
  }, [workflowStage, currentProfile, goBack, goNext]);

  const stageInfo = useMemo(() =>
    STAGE_INFO[workflowStage] ?? { title: '未知階段', description: '' },
    [workflowStage]
  );

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

  // 獲取階段狀態
  const getStageStatus = useCallback((stageKey: WorkflowStages) => {
    const stageOrder = [WorkflowStages.PROFILE_MANAGEMENT, WorkflowStages.DESIGN_WORKBENCH, WorkflowStages.EXPORT_MANAGER];
    const currentIndex = stageOrder.indexOf(workflowStage);
    const targetIndex = stageOrder.indexOf(stageKey);

    if (stageKey === workflowStage) return 'current';
    if (targetIndex < currentIndex) return 'completed';
    return 'upcoming';
  }, [workflowStage]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">初始化應用中...</h2>
          <p className="text-sm text-gray-600 mt-1">正在載入 Buzzer 應用核心</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* 頂部導航欄 */}
          <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-14">
                {/* 標題 */}
                <h1 className="text-base font-bold text-gray-900 flex-shrink-0">
                  Buzzer 設計工作站
                </h1>

                {/* 工作流程指示器 - 所有裝置可見 */}
                <nav className="flex items-center gap-1" aria-label="工作流程步驟">
                  {STAGES.map((stage, index) => {
                    const status = getStageStatus(stage.key);
                    const isClickable = status === 'completed' || status === 'current' ||
                      (stage.key !== WorkflowStages.PROFILE_MANAGEMENT && currentProfile);

                    return (
                      <div key={stage.key} className="flex items-center">
                        {index > 0 && (
                          <div className={`w-4 sm:w-8 h-px mx-0.5 ${status === 'upcoming' ? 'bg-gray-300' : 'bg-blue-400'}`} />
                        )}
                        <button
                          onClick={() => isClickable && handleStageClick(stage.key)}
                          disabled={!isClickable}
                          className={`
                            flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all
                            ${status === 'current'
                              ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                              : status === 'completed'
                                ? 'bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                                : 'text-gray-400 cursor-not-allowed'}
                          `}
                          aria-label={`${stage.label} ${status === 'current' ? '(當前)' : status === 'completed' ? '(已完成)' : ''}`}
                          aria-current={status === 'current' ? 'step' : undefined}
                        >
                          {/* 狀態圖示 */}
                          {status === 'completed' ? (
                            <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                              status === 'current' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'
                            }`}>
                              {index + 1}
                            </span>
                          )}
                          {/* 桌面顯示文字，行動端只顯示數字 */}
                          <span className="hidden sm:inline">{stage.label}</span>
                        </button>
                      </div>
                    );
                  })}
                </nav>

                {/* 導航按鈕 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {workflowStage !== WorkflowStages.PROFILE_MANAGEMENT && (
                    <Button onClick={handleGoBack} variant="secondary" size="sm" aria-label="返回上一步">
                      <span className="hidden sm:inline">返回</span>
                      <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>
                  )}

                  {canGoNext && workflowStage !== WorkflowStages.EXPORT_MANAGER && (
                    <Button onClick={handleGoNext} variant="primary" size="sm" aria-label="前往下一步">
                      <span className="hidden sm:inline">下一步</span>
                      <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* 主要內容區域 */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* 階段標題 */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">{stageInfo.title}</h2>
              <p className="text-sm text-gray-600 mt-0.5">{stageInfo.description}</p>
            </div>

            {/* 內容（帶過渡動畫） */}
            <div
              key={workflowStage}
              className={transitionDirection === 'right' ? 'animate-slide-up' : 'animate-fade-in'}
            >
              {workflowStage === WorkflowStages.PROFILE_MANAGEMENT && (
                <ProfileManagerUI />
              )}

              {workflowStage === WorkflowStages.DESIGN_WORKBENCH && (
                <div className="space-y-6">
                  {/* 快速狀態信息條 */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 bg-white rounded-lg border border-gray-200 px-4 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Profile: <span className="font-medium text-gray-900">{currentProfile?.buzzer_name || '未選擇'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      編輯中: <span className="font-medium text-gray-900">{editingPattern?.notes?.length || 0} 音符</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      模式: <span className="font-medium text-gray-900">{currentPattern?.name || '未選擇'}</span>
                    </span>
                  </div>

                  {/* 音樂棋盤 */}
                  <MusicalBoard
                    onNoteSelect={handleNoteSelect}
                    onNoteRemove={handleNoteRemove}
                    onNotesClear={handleNotesClear}
                    selectedNotes={selectedNotes}
                  />

                  {/* 雙欄佈局 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <PatternEditor
                      pattern={editingPattern ?? undefined}
                      onPatternChange={handlePatternChange}
                      onSave={handlePatternSave}
                      currentPlayingIndex={playingIndex}
                    />
                    <PatternLibrary
                      onPatternSelect={handlePatternSelect}
                      selectedPatternId={currentPattern?.id}
                      onPatternEdit={handlePatternEdit}
                    />
                  </div>

                  {/* 播放控制 */}
                  <PlaybackControls
                    pattern={currentPattern ?? editingPattern ?? undefined}
                    onPlayingIndexChange={setPlayingIndex}
                  />
                </div>
              )}

              {workflowStage === WorkflowStages.EXPORT_MANAGER && (
                <ExportManager />
              )}
            </div>
          </main>

          {/* 底部狀態欄 */}
          <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-3">
                  <span>Buzzer 設計工作站 v2.0</span>
                  {currentProfile && (
                    <span className="hidden sm:inline">Profile: {currentProfile.buzzer_name}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline">階段: {stageInfo.title}</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true" />
                    <span>{isInitialized ? '已連接' : '未連接'}</span>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}
