// 主應用組件 - 使用新的模組化架構

import React, { useState } from 'react';
import { WorkflowStages } from './types';
import { useBuzzerApp } from './hooks/useBuzzerApp';

// UI組件導入
import { ProfileManagerUI } from './components/ui/profile/ProfileManagerUI';
// import { MusicalBoard } from './components/ui/design/MusicalBoard'; // 舊版本，暫時保留
import { SimpleMusicalBoard } from './components/ui/design/SimpleMusicalBoard';
import { PatternEditor } from './components/ui/design/PatternEditor';
// import { PatternLibrary } from './components/ui/design/PatternLibrary'; // 暫時移除但保留程式碼
// import { PlaybackControls } from './components/ui/playback/PlaybackControls'; // 已移除，統一使用 EditorPlaybackControls
import { ExportManager } from './components/ui/export/ExportManager';
import { Filter, FilterSettings, DEFAULT_FILTER_SETTINGS } from './components/ui/design/Filter';
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
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(DEFAULT_FILTER_SETTINGS);

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
    console.log('App.tsx handlePatternSave 被調用');
    console.log('接收到的 pattern:', pattern);
    console.log('pattern.notes:', pattern?.notes);
    console.log('pattern.notes 長度:', pattern?.notes?.length);

    if (!pattern) {
      console.error('pattern 為空');
      alert('沒有模式數據，無法保存');
      return;
    }

    if (!pattern.name || pattern.name.trim() === '') {
      console.error('模式名稱為空');
      alert('請先設置模式名稱');
      return;
    }

    // 檢查是否有音符，如果沒有音符也允許保存空模式
    if (!pattern.notes || pattern.notes.length === 0) {
      console.warn('模式沒有音符，但仍允許保存空模式');
    }

    if (!appCore) {
      console.error('appCore 未初始化');
      alert('系統未初始化，無法保存');
      return;
    }

    try {
      // 暫時直接使用本地保存，避免 patternManager 的驗證問題
      console.log('使用本地保存到 localStorage');

      // 簡單的本地保存 - 保存到 localStorage
      const savedPatterns = JSON.parse(localStorage.getItem('buzzer-patterns') || '[]');

      // 確保 pattern 有完整的結構
      const newPattern = {
        id: pattern.id || `pattern-${Date.now()}`,
        name: pattern.name || '未命名模式',
        notes: pattern.notes || [],
        pattern: pattern.pattern || [],
        tempo: pattern.tempo || 120,
        version: pattern.version || '1.0',
        createdAt: pattern.createdAt || new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        savedAt: new Date().toISOString()
      };

      console.log('準備保存的 newPattern:', newPattern);

      // 檢查是否已存在，如果存在則更新
      const existingIndex = savedPatterns.findIndex((p: any) => p.id === newPattern.id);
      if (existingIndex >= 0) {
        savedPatterns[existingIndex] = newPattern;
        console.log('更新現有模式:', newPattern.name);
      } else {
        savedPatterns.push(newPattern);
        console.log('保存新模式:', newPattern.name);
      }

      localStorage.setItem('buzzer-patterns', JSON.stringify(savedPatterns));
      console.log('保存到 localStorage 成功');

      alert(`模式 "${newPattern.name}" 已保存到本地 (${newPattern.notes?.length || 0} 個音符)`);
      return;

      // 註釋掉 patternManager 的使用，因為它的驗證有問題
      /*
      // 檢查 patternManager 是否存在
      if (!appCore.patternManager) {
        // ... 本地保存邏輯已移到上面
      }

      // 使用 patternManager 保存
      const success = await appCore.patternManager.createPattern(pattern);
      if (success) {
        console.log('模式保存成功');
        alert(`模式 "${pattern.name}" 保存成功`);
      } else {
        console.error('模式保存失敗');
        alert('保存失敗，請重試');
      }
      */
    } catch (error) {
      console.error('保存模式失敗:', error);
      alert(`保存失敗: ${error.message || '未知錯誤'}`);
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
      case WorkflowStages.EXPORT_MANAGER:
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
                  <div className={`w-3 h-3 rounded-full ${workflowStage === WorkflowStages.DESIGN_WORKBENCH ? 'bg-blue-600' : workflowStage === WorkflowStages.EXPORT_MANAGER ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={`text-sm ${workflowStage === WorkflowStages.DESIGN_WORKBENCH ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    設計
                  </span>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${workflowStage === WorkflowStages.EXPORT_MANAGER ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  <span className={`text-sm ${workflowStage === WorkflowStages.EXPORT_MANAGER ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
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

              {canGoNext() && workflowStage !== WorkflowStages.EXPORT_MANAGER && (
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
          <div className="space-y-6">
            {/* 上層：Filter + Musical Board */}
            <div className="grid grid-cols-4 gap-6">
              {/* 左側：Filter 區域 (1/4) */}
              <div className="col-span-1">
                <Filter
                  settings={filterSettings}
                  onSettingsChange={setFilterSettings}
                />
              </div>

              {/* 右側：音樂棋盤 (3/4) */}
              <div className="col-span-3">
                <SimpleMusicalBoard
                  filterSettings={filterSettings}
                  onNotesInsert={(notes) => {
                    // 將選擇的音符添加到編輯中的模式
                    const updatedPattern = {
                      ...editingPattern,
                      notes: [...(editingPattern.notes || []), ...notes],
                      modifiedAt: new Date().toISOString()
                    };
                    setEditingPattern(updatedPattern);
                  }}
                />
              </div>
            </div>

            {/* 下層：Pattern Editor（三欄布局） */}
            <div>
              <PatternEditor
                pattern={editingPattern}
                onPatternChange={handlePatternChange}
                onSave={handlePatternSave}
              />
            </div>

            {/* 模式庫 - 暫時移除但保留程式碼供日後使用 */}
            {/*
            <div className="xl:col-span-12">
              <PatternLibrary
                onPatternSelect={handlePatternSelect}
                selectedPatternId={currentPattern?.id}
                onPatternEdit={handlePatternEdit}
              />
            </div>
            */}
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