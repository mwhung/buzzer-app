// 主應用組件 - 使用新的模組化架構

import React, { useState } from 'react';
import { WorkflowStages } from './types';
import { useBuzzerApp } from './hooks/useBuzzerApp';

// UI組件導入
import { ProfileManagerUI } from './components/ui/profile/ProfileManagerUI';
import { MusicalBoard } from './components/ui/design/MusicalBoard';
import { PatternEditor } from './components/ui/design/PatternEditor';
import { PatternLibrary } from './components/ui/design/PatternLibrary';
import { PlaybackControls } from './components/ui/playback/PlaybackControls';
import { ExportManager } from './components/ui/export/ExportManager';
import { Button } from './components/ui/common/Button';

import './App.css';

export default function App() {
  const {
    appCore,
    workflowStage,
    currentProfile,
    currentPattern,
    isInitialized,
    goToStage,
    goBack,
    goNext
  } = useBuzzerApp();

  // 本地狀態
  const [selectedNotes, setSelectedNotes] = useState<any[]>([]);

  // 創建穩定的空 pattern 初始值
  const [editingPattern, setEditingPattern] = useState<any>(() => ({
    id: `temp-${Date.now()}`,
    name: '新模式',
    notes: [],
    pattern: [],
    tempo: 120,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  }));

  // 處理音符選擇（從音樂棋盤）
  const handleNoteSelect = (note: any) => {
    if (editingPattern && appCore) {
      // 添加音符到當前編輯的模式
      const updatedPattern = {
        ...editingPattern,
        notes: [...editingPattern.notes, note],
        updated_at: new Date().toISOString()
      };
      setEditingPattern(updatedPattern);
      setSelectedNotes([...selectedNotes, note]);
    }
  };

  // 處理模式變更
  const handlePatternChange = (pattern: any) => {
    setEditingPattern(pattern);
  };

  // 處理模式保存
  const handlePatternSave = async (pattern: any) => {
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
  };

  // 處理模式選擇（從庫中）
  const handlePatternSelect = (pattern: any) => {
    if (appCore) {
      appCore.patternManager.setCurrentPattern(pattern.id);
    }
  };

  // 處理模式編輯
  const handlePatternEdit = (pattern: any) => {
    setEditingPattern(pattern);
    setSelectedNotes(pattern.notes || []);
  };

  // 獲取工作流程步驟信息
  const getStageInfo = (stage: WorkflowStages) => {
    switch (stage) {
      case WorkflowStages.PROFILE_MANAGEMENT:
        return { title: 'Profile 管理', description: '選擇或導入 Buzzer 音頻特性檔案' };
      case WorkflowStages.DESIGN_WORKBENCH:
        return { title: '設計工作台', description: '使用音樂棋盤和模式編輯器創建音頻序列' };
      case WorkflowStages.EXPORT_MANAGEMENT:
        return { title: '導出管理', description: '批量選擇和導出音頻模式' };
      default:
        return { title: '未知階段', description: '' };
    }
  };

  // 檢查當前階段是否可以前進
  const canGoNext = () => {
    switch (workflowStage) {
      case WorkflowStages.PROFILE_MANAGEMENT:
        return !!currentProfile;
      case WorkflowStages.DESIGN_WORKBENCH:
        return true; // 總是可以到導出階段
      default:
        return false;
    }
  };

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

  const stageInfo = getStageInfo(workflowStage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航欄 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 標題和階段指示器 */}
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">Buzzer 設計工作站</h1>

              {/* 工作流程指示器 */}
              <div className="hidden md:flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${workflowStage === WorkflowStages.PROFILE_MANAGEMENT ? 'bg-blue-600' : 'bg-green-500'}`} />
                  <span className={`text-sm ${workflowStage === WorkflowStages.PROFILE_MANAGEMENT ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    Profile
                  </span>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${workflowStage === WorkflowStages.DESIGN_WORKBENCH ? 'bg-blue-600' : workflowStage === WorkflowStages.EXPORT_MANAGEMENT ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={`text-sm ${workflowStage === WorkflowStages.DESIGN_WORKBENCH ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    設計
                  </span>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${workflowStage === WorkflowStages.EXPORT_MANAGEMENT ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  <span className={`text-sm ${workflowStage === WorkflowStages.EXPORT_MANAGEMENT ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    導出
                  </span>
                </div>
              </div>
            </div>

            {/* 工作流程控制按鈕 */}
            <div className="flex items-center space-x-3">
              {workflowStage !== WorkflowStages.PROFILE_MANAGEMENT && (
                <Button
                  onClick={goBack}
                  variant="secondary"
                  size="sm"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  }
                >
                  返回
                </Button>
              )}

              {canGoNext() && workflowStage !== WorkflowStages.EXPORT_MANAGEMENT && (
                <Button
                  onClick={goNext}
                  variant="primary"
                  size="sm"
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
                  pattern={editingPattern}
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
              pattern={currentPattern || editingPattern}
            />
          </div>
        )}

        {workflowStage === WorkflowStages.EXPORT_MANAGEMENT && (
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
                <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{isInitialized ? '已連接' : '未連接'}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}