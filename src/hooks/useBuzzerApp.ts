// React Hook for Buzzer App Core integration

import { useEffect, useState, useRef, useCallback } from 'react';
import { BuzzerAppCore, AppState, Buzzer, Pattern, WorkflowStages } from '../modules';

export interface UseBuzzerAppReturn {
  // 核心實例
  appCore: BuzzerAppCore;

  // 應用狀態
  appState: AppState;
  isInitialized: boolean;

  // 當前數據
  currentProfile: Buzzer | null;
  currentPattern: Pattern | null;
  workflowStage: WorkflowStages;

  // 播放狀態
  isPlaying: boolean;
  isExporting: boolean;

  // 錯誤處理
  errors: string[];

  // 快捷操作
  playCurrentPattern: () => Promise<boolean>;
  stopPlayback: () => void;
  exportCurrentPattern: (format?: 'wav' | 'json') => Promise<boolean>;
  clearErrors: () => void;

  // 工作流程控制
  goToStage: (stage: WorkflowStages) => Promise<boolean>;
  goBack: () => Promise<boolean>;
  goNext: () => Promise<boolean>;

  // 統計信息
  statistics: {
    profileCount: number;
    patternCount: number;
    totalPatternDuration: number;
    currentStage: string;
    playbackTime: number;
  };
}

/**
 * Buzzer App 核心集成Hook
 */
export function useBuzzerApp(): UseBuzzerAppReturn {
  // 創建app core實例（只創建一次）
  const appCoreRef = useRef<BuzzerAppCore | null>(null);

  // 狀態
  const [appState, setAppState] = useState<AppState>({
    isInitialized: false,
    currentProfile: null,
    currentPattern: null,
    workflowStage: WorkflowStages.PROFILE_MANAGEMENT,
    isPlaying: false,
    isExporting: false,
    errors: []
  });

  const [statistics, setStatistics] = useState({
    profileCount: 0,
    patternCount: 0,
    totalPatternDuration: 0,
    currentStage: WorkflowStages.PROFILE_MANAGEMENT as string,
    playbackTime: 0
  });

  // 初始化app core
  useEffect(() => {
    if (!appCoreRef.current) {
      appCoreRef.current = new BuzzerAppCore({
        initialWorkflowStage: WorkflowStages.PROFILE_MANAGEMENT,
        defaultMasterVolume: 0.3
      });

      // 設置事件監聽器
      const appCore = appCoreRef.current;

      // 監聽所有應用事件
      appCore.addEventListener('*', (event) => {
        console.log('App Event:', event);
        updateAppState();
      });

      // 初始化應用
      appCore.initialize().catch(error => {
        console.error('App初始化失敗:', error);
      });
    }

    return () => {
      if (appCoreRef.current) {
        appCoreRef.current.dispose();
        appCoreRef.current = null;
      }
    };
  }, []);

  // 更新應用狀態
  const updateAppState = useCallback(() => {
    if (!appCoreRef.current) return;

    const newAppState = appCoreRef.current.getAppState();
    const newStatistics = appCoreRef.current.getAppStatistics();

    setAppState(newAppState);
    setStatistics(newStatistics);
  }, []);

  // 事件驅動狀態更新（移除定期輪詢）
  // 改為在初始化時設置事件監聽器進行狀態同步

  // 快捷操作
  const playCurrentPattern = useCallback(async (): Promise<boolean> => {
    if (!appCoreRef.current) return false;
    return await appCoreRef.current.playCurrentPattern();
  }, []);

  const stopPlayback = useCallback(() => {
    if (!appCoreRef.current) return;
    appCoreRef.current.stopPlayback();
  }, []);

  const exportCurrentPattern = useCallback(async (format: 'wav' | 'json' = 'wav'): Promise<boolean> => {
    if (!appCoreRef.current) return false;
    return await appCoreRef.current.exportCurrentPattern(format);
  }, []);

  const clearErrors = useCallback(() => {
    if (!appCoreRef.current) return;
    appCoreRef.current.clearErrors();
  }, []);

  // 工作流程控制
  const goToStage = useCallback(async (stage: WorkflowStages): Promise<boolean> => {
    if (!appCoreRef.current) return false;
    return await appCoreRef.current.workflowManager.goToStage(stage);
  }, []);

  const goBack = useCallback(async (): Promise<boolean> => {
    if (!appCoreRef.current) return false;
    return await appCoreRef.current.workflowManager.goBack();
  }, []);

  const goNext = useCallback(async (): Promise<boolean> => {
    if (!appCoreRef.current) return false;
    return await appCoreRef.current.workflowManager.goNext();
  }, []);

  return {
    // 核心實例
    appCore: appCoreRef.current!,

    // 應用狀態
    appState,
    isInitialized: appState.isInitialized,

    // 當前數據
    currentProfile: appState.currentProfile,
    currentPattern: appState.currentPattern,
    workflowStage: appState.workflowStage,

    // 播放狀態
    isPlaying: appState.isPlaying,
    isExporting: appState.isExporting,

    // 錯誤處理
    errors: appState.errors,

    // 快捷操作
    playCurrentPattern,
    stopPlayback,
    exportCurrentPattern,
    clearErrors,

    // 工作流程控制
    goToStage,
    goBack,
    goNext,

    // 統計信息
    statistics
  };
}