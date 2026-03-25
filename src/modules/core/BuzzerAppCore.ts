// Buzzer應用核心類 - 統合所有模組，提供統一的應用接口

import { AudioEngine } from '../audio/AudioEngine';
import { MusicTheory } from '../music/MusicTheory';
import { ProfileManager } from '../profile/ProfileManager';
import { PatternManager } from '../pattern/PatternManager';
import { ExportEngine } from '../export/ExportEngine';
import { WorkflowManager } from '../workflow/WorkflowManager';
import { StorageManager } from '../storage/StorageManager';

import {
  Buzzer,
  Pattern,
  WorkflowStages,
  AudioEvent,
  PatternEvent,
  ProfileEvent
} from '../../types';
import { WorkflowEvent } from '../workflow/WorkflowManager';
import { ensurePatternSync } from '../../utils/patternConverter';

export interface BuzzerAppConfig {
  initialWorkflowStage?: WorkflowStages;
  autoSave?: boolean;
  defaultMasterVolume?: number;
  maxPatternHistory?: number;
}

export interface AppState {
  isInitialized: boolean;
  currentProfile: Buzzer | null;
  currentPattern: Pattern | null;
  workflowStage: WorkflowStages;
  isPlaying: boolean;
  isExporting: boolean;
  errors: string[];
}

/**
 * Buzzer應用程序核心類
 * 統合所有功能模組，提供統一的應用程序接口
 */
export class BuzzerAppCore {
  // 核心模組實例
  public readonly audioEngine: AudioEngine;
  public readonly musicTheory: typeof MusicTheory;
  public readonly profileManager: ProfileManager;
  public readonly patternManager: PatternManager;
  public readonly exportEngine: ExportEngine;
  public readonly workflowManager: WorkflowManager;
  public readonly storageManager: StorageManager;

  // 應用狀態
  private appState: AppState;
  private config: BuzzerAppConfig;

  // 事件監聽器
  private eventListeners: Map<string, ((event: any) => void)[]> = new Map();

  // 狀態記憶化緩存
  private cachedAppState: AppState | null = null;
  private cachedStatistics: any = null;

  constructor(config: BuzzerAppConfig = {}) {
    this.config = {
      initialWorkflowStage: WorkflowStages.PROFILE_MANAGEMENT,
      autoSave: true,
      defaultMasterVolume: 0.3,
      maxPatternHistory: 50,
      ...config
    };

    // 初始化應用狀態
    this.appState = {
      isInitialized: false,
      currentProfile: null,
      currentPattern: null,
      workflowStage: this.config.initialWorkflowStage!,
      isPlaying: false,
      isExporting: false,
      errors: []
    };

    // 初始化核心模組
    this.audioEngine = new AudioEngine();
    this.musicTheory = MusicTheory;
    this.profileManager = new ProfileManager();
    this.patternManager = new PatternManager();
    this.exportEngine = new ExportEngine(this.audioEngine);
    this.workflowManager = new WorkflowManager(this.config.initialWorkflowStage);
    this.storageManager = new StorageManager();

    // 設置模組間的事件監聽
    this.setupCrossModuleEventListening();

    // 設置初始狀態
    this.updateAppStateFromModules();

    console.log('BuzzerAppCore: 核心初始化完成');
  }

  /**
   * 異步初始化應用程序
   */
  async initialize(): Promise<void> {
    try {
      console.log('BuzzerAppCore: 開始初始化應用程序...');

      // 設置默認音量
      this.audioEngine.setMasterVolume(this.config.defaultMasterVolume || 0.3);

      // 初始化 IndexedDB 並載入已儲存的資料
      await this.loadFromStorage();

      // 設置自動儲存監聽
      if (this.config.autoSave) {
        this.setupAutoSave();
      }

      // 獲取初始數據
      const currentProfile = this.profileManager.getCurrentProfile();
      const currentPattern = this.patternManager.getCurrentPattern();

      // 更新應用狀態
      this.appState.currentProfile = currentProfile;
      this.appState.currentPattern = currentPattern;
      this.appState.isInitialized = true;

      // 設置工作流程初始數據
      if (currentProfile) {
        this.workflowManager.setStageData(WorkflowStages.PROFILE_MANAGEMENT, {
          currentProfile,
          profiles: this.profileManager.getAllProfiles()
        });
      }

      if (currentPattern) {
        this.workflowManager.setStageData(WorkflowStages.DESIGN_WORKBENCH, {
          currentPattern,
          patterns: this.patternManager.getAllPatterns()
        });
      }

      console.log('BuzzerAppCore: 應用程序初始化完成');

    } catch (error) {
      console.error('BuzzerAppCore: 初始化失敗', error);
      this.addError(error instanceof Error ? error.message : '初始化失敗');
      throw error;
    }
  }

  /**
   * 從 IndexedDB 載入已儲存的資料
   */
  private async loadFromStorage(): Promise<void> {
    try {
      await this.storageManager.initialize();

      // 載入已儲存的 profiles
      const storedProfiles = await this.storageManager.getAllProfiles();
      if (storedProfiles.length > 0) {
        for (const { id, profile } of storedProfiles) {
          this.profileManager.loadProfileDirect(id, profile);
        }
        console.log(`BuzzerAppCore: 從儲存載入 ${storedProfiles.length} 個 profiles`);

        // 恢復上次選中的 profile
        const savedProfileId = await this.storageManager.getMeta<string>('currentProfileId');
        if (savedProfileId) {
          this.profileManager.setCurrentProfile(savedProfileId);
        }
      }

      // 載入已儲存的 patterns
      const storedPatterns = await this.storageManager.getAllPatterns();
      if (storedPatterns.length > 0) {
        for (const { id, pattern } of storedPatterns) {
          this.patternManager.loadPatternDirect(id, pattern);
        }
        console.log(`BuzzerAppCore: 從儲存載入 ${storedPatterns.length} 個 patterns`);

        // 恢復上次選中的 pattern
        const savedPatternId = await this.storageManager.getMeta<string>('currentPatternId');
        if (savedPatternId) {
          this.patternManager.setCurrentPattern(savedPatternId);
        }
      }
    } catch (error) {
      console.warn('BuzzerAppCore: 從儲存載入資料失敗，使用預設資料', error);
    }
  }

  /**
   * 設置自動儲存：監聽 profile/pattern 變更事件，自動寫入 IndexedDB
   */
  private setupAutoSave(): void {
    // Profile 變更自動儲存
    this.profileManager.addEventListener('create', (event) => {
      if (event.profileId && event.profile) {
        this.storageManager.saveProfile(event.profileId, event.profile).catch(console.error);
      }
    });
    this.profileManager.addEventListener('import', (event) => {
      if (event.profileId && event.profile) {
        this.storageManager.saveProfile(event.profileId, event.profile).catch(console.error);
      }
    });
    this.profileManager.addEventListener('delete', (event) => {
      if (event.profileId) {
        this.storageManager.deleteProfile(event.profileId).catch(console.error);
      }
    });
    this.profileManager.addEventListener('select', (event) => {
      if (event.profileId) {
        this.storageManager.setMeta('currentProfileId', event.profileId).catch(console.error);
      }
    });

    // Pattern 變更自動儲存
    this.patternManager.addEventListener('create', (event) => {
      if (event.patternId && event.pattern) {
        this.storageManager.savePattern(event.patternId, event.pattern).catch(console.error);
      }
    });
    this.patternManager.addEventListener('update', (event) => {
      if (event.patternId && event.pattern) {
        this.storageManager.savePattern(event.patternId, event.pattern).catch(console.error);
        // 每次更新時自動保存版本快照
        this.storageManager.saveVersion(event.patternId, event.pattern).catch(console.error);
      }
    });
    this.patternManager.addEventListener('delete', (event) => {
      if (event.patternId) {
        this.storageManager.deletePattern(event.patternId).catch(console.error);
      }
    });
    this.patternManager.addEventListener('select', (event) => {
      if (event.patternId) {
        this.storageManager.setMeta('currentPatternId', event.patternId).catch(console.error);
      }
    });

    console.log('BuzzerAppCore: 自動儲存已啟用');
  }

  /**
   * 獲取 pattern 的版本歷史
   */
  async getPatternVersions(patternId: string) {
    return this.storageManager.getVersionsByPatternId(patternId);
  }

  /**
   * 恢復 pattern 到指定版本
   */
  async restorePatternVersion(versionId: string): Promise<boolean> {
    try {
      const version = await this.storageManager.getVersion(versionId);
      if (!version) {
        this.addError('找不到指定的版本');
        return false;
      }

      const success = this.patternManager.updatePattern(version.patternId, {
        ...version.pattern,
        modifiedAt: new Date().toISOString()
      });

      if (success) {
        console.log(`BuzzerAppCore: 已恢復 pattern 到版本 ${versionId}`);
      }
      return success;
    } catch (error) {
      const message = error instanceof Error ? error.message : '版本恢復失敗';
      this.addError(message);
      return false;
    }
  }

  /**
   * 手動儲存所有當前資料到 IndexedDB
   */
  async saveAll(): Promise<void> {
    try {
      // 儲存所有 profiles
      for (const { id, profile } of this.profileManager.getAllProfiles()) {
        await this.storageManager.saveProfile(id, profile);
      }

      // 儲存所有 patterns
      for (const pattern of this.patternManager.getAllPatterns()) {
        if (pattern.id) {
          await this.storageManager.savePattern(pattern.id, pattern);
        }
      }

      // 儲存當前選中項
      const currentProfileId = this.profileManager.getCurrentProfileId();
      const currentPatternId = this.patternManager.getCurrentPatternId();
      if (currentProfileId) await this.storageManager.setMeta('currentProfileId', currentProfileId);
      if (currentPatternId) await this.storageManager.setMeta('currentPatternId', currentPatternId);

      console.log('BuzzerAppCore: 所有資料已手動儲存');
    } catch (error) {
      const message = error instanceof Error ? error.message : '儲存失敗';
      this.addError(message);
      throw error;
    }
  }

  /**
   * 設置模組間的事件監聽
   */
  private setupCrossModuleEventListening(): void {
    // Profile變更時更新應用狀態和工作流程
    this.profileManager.addEventListener('select', (event: ProfileEvent) => {
      this.appState.currentProfile = event.profile || null;
      this.workflowManager.setStageData(WorkflowStages.PROFILE_MANAGEMENT, {
        currentProfile: event.profile,
        profiles: this.profileManager.getAllProfiles()
      });
      this.emitAppEvent('profile-changed', event);
    });

    // Pattern變更時更新應用狀態和工作流程
    this.patternManager.addEventListener('select', (event: PatternEvent) => {
      this.appState.currentPattern = event.pattern || null;
      this.workflowManager.setStageData(WorkflowStages.DESIGN_WORKBENCH, {
        currentPattern: event.pattern,
        patterns: this.patternManager.getAllPatterns()
      });
      this.emitAppEvent('pattern-changed', event);
    });

    // 音頻播放狀態變更
    this.audioEngine.addEventListener('play', (event: AudioEvent) => {
      this.appState.isPlaying = true;
      this.emitAppEvent('playback-started', event);
    });

    this.audioEngine.addEventListener('stop', (event: AudioEvent) => {
      this.appState.isPlaying = false;
      this.emitAppEvent('playback-stopped', event);
    });

    // 導出狀態變更
    this.exportEngine.onProgress((progress) => {
      this.appState.isExporting = progress.overallProgress < 100;
      this.emitAppEvent('export-progress', progress);
    });

    this.exportEngine.onComplete((results) => {
      this.appState.isExporting = false;
      this.emitAppEvent('export-complete', results);
    });

    // 工作流程變更
    this.workflowManager.addEventListener('stage-change', (event: WorkflowEvent) => {
      this.appState.workflowStage = event.currentStage;
      this.emitAppEvent('workflow-stage-changed', event);
    });
  }

  /**
   * 清除狀態緩存
   */
  private clearStateCache(): void {
    this.cachedAppState = null;
    this.cachedStatistics = null;
  }

  /**
   * 從模組更新應用狀態
   */
  private updateAppStateFromModules(): void {
    this.appState.currentProfile = this.profileManager.getCurrentProfile();
    this.appState.currentPattern = this.patternManager.getCurrentPattern();
    this.appState.workflowStage = this.workflowManager.getCurrentStage();
    this.appState.isPlaying = this.audioEngine.getPlaybackState().isPlaying;
    this.appState.isExporting = this.exportEngine.isCurrentlyExporting();

    // 狀態更新後清除緩存
    this.clearStateCache();
  }

  /**
   * 淺比較兩個對象是否相等
   */
  private shallowEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (!obj1 || !obj2) return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (let key of keys1) {
      if (obj1[key] !== obj2[key]) return false;
    }

    return true;
  }

  /**
   * 獲取應用狀態（記憶化版本）
   */
  getAppState(): AppState {
    // 如果沒有緩存或狀態發生變化，創建新的狀態對象
    if (!this.cachedAppState || !this.shallowEqual(this.cachedAppState, this.appState)) {
      this.cachedAppState = { ...this.appState };
    }

    return this.cachedAppState;
  }

  /**
   * 獲取應用配置
   */
  getConfig(): BuzzerAppConfig {
    return { ...this.config };
  }

  /**
   * 檢查應用是否已初始化
   */
  isInitialized(): boolean {
    return this.appState.isInitialized;
  }

  /**
   * 快速播放當前pattern
   */
  async playCurrentPattern(): Promise<boolean> {
    const currentProfile = this.appState.currentProfile;
    const currentPattern = this.appState.currentPattern;

    if (!currentProfile || !currentPattern) {
      this.addError('沒有選中的Profile或Pattern');
      return false;
    }

    try {
      await this.audioEngine.playPattern(currentPattern, currentProfile);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '播放失敗';
      this.addError(message);
      return false;
    }
  }

  /**
   * 停止播放
   */
  stopPlayback(): void {
    this.audioEngine.stopPlayback();
  }

  /**
   * 快速導出當前pattern
   */
  async exportCurrentPattern(format: 'wav' | 'json' = 'wav'): Promise<boolean> {
    const currentProfile = this.appState.currentProfile;
    const currentPattern = this.appState.currentPattern;

    if (!currentProfile || !currentPattern) {
      this.addError('沒有選中的Profile或Pattern');
      return false;
    }

    try {
      const blob = await this.exportEngine.exportSinglePattern(
        currentPattern,
        currentProfile,
        format
      );

      // 觸發下載
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentPattern.name}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '導出失敗';
      this.addError(message);
      return false;
    }
  }

  /**
   * 獲取應用統計信息（記憶化版本）
   */
  getAppStatistics(): {
    profileCount: number;
    patternCount: number;
    totalPatternDuration: number;
    currentStage: string;
    playbackTime: number;
  } {
    const patterns = this.patternManager.getAllPatterns();
    const totalDuration = patterns.reduce((sum, pattern) => {
      const stats = this.patternManager.getPatternStats(pattern.id || '');
      return sum + (stats?.totalDuration || 0);
    }, 0);

    const newStatistics = {
      profileCount: this.profileManager.getAllProfiles().length,
      patternCount: patterns.length,
      totalPatternDuration: totalDuration,
      currentStage: this.appState.workflowStage,
      playbackTime: 0 // TODO: 實現播放時間統計
    };

    // 如果沒有緩存或統計信息發生變化，使用新的統計對象
    if (!this.cachedStatistics || !this.shallowEqual(this.cachedStatistics, newStatistics)) {
      this.cachedStatistics = newStatistics;
    }

    return this.cachedStatistics;
  }

  /**
   * 獲取同步的Pattern對象（確保pattern和notes數組一致）
   */
  getSyncedPattern(patternId?: string): Pattern | null {
    let pattern: Pattern | null;

    if (patternId) {
      pattern = this.patternManager.getPattern(patternId);
    } else {
      pattern = this.appState.currentPattern;
    }

    if (!pattern) return null;

    return ensurePatternSync(pattern);
  }

  /**
   * 獲取所有同步的Pattern對象
   */
  getAllSyncedPatterns(): Pattern[] {
    const patterns = this.patternManager.getAllPatterns();
    return patterns.map(pattern => ensurePatternSync(pattern));
  }

  /**
   * 更新Pattern並保持同步
   */
  updateSyncedPattern(updatedPattern: Partial<Pattern>): boolean {
    try {
      const syncedPattern = ensurePatternSync(updatedPattern);

      // 更新PatternManager
      if (syncedPattern.id) {
        this.patternManager.updatePattern(syncedPattern.id, syncedPattern);
      }

      // 如果是當前Pattern，更新應用狀態
      if (this.appState.currentPattern?.id === syncedPattern.id) {
        this.appState.currentPattern = syncedPattern;
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pattern同步失敗';
      this.addError(message);
      return false;
    }
  }

  /**
   * 添加錯誤信息
   */
  private addError(message: string): void {
    this.appState.errors.push(message);
    // 保持錯誤列表不超過10條
    if (this.appState.errors.length > 10) {
      this.appState.errors = this.appState.errors.slice(-10);
    }

    // 狀態更新後清除緩存
    this.clearStateCache();

    console.error('BuzzerAppCore:', message);
    this.emitAppEvent('error', { message });
  }

  /**
   * 清除錯誤信息
   */
  clearErrors(): void {
    this.appState.errors = [];

    // 狀態更新後清除緩存
    this.clearStateCache();

    this.emitAppEvent('errors-cleared', {});
  }

  /**
   * 獲取錯誤信息
   */
  getErrors(): string[] {
    return [...this.appState.errors];
  }

  /**
   * 重置應用程序
   */
  async reset(): Promise<void> {
    console.log('BuzzerAppCore: 重置應用程序');

    // 停止所有活動
    this.audioEngine.stopPlayback();
    this.exportEngine.cancelExport();

    // 重置工作流程
    this.workflowManager.reset();

    // 重置應用狀態
    this.appState.isPlaying = false;
    this.appState.isExporting = false;
    this.appState.errors = [];
    this.appState.workflowStage = WorkflowStages.PROFILE_MANAGEMENT;

    // 更新當前選中項
    this.updateAppStateFromModules();

    this.emitAppEvent('app-reset', {});
  }

  /**
   * 應用程序事件監聽
   */
  addEventListener(eventType: string, callback: (event: any) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * 移除應用程序事件監聽
   */
  removeEventListener(eventType: string, callback: (event: any) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 觸發應用程序事件
   */
  private emitAppEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback({ type: eventType, data }));
    }

    // 觸發通用事件
    const allListeners = this.eventListeners.get('*');
    if (allListeners) {
      allListeners.forEach(callback => callback({ type: eventType, data }));
    }
  }

  /**
   * 銷毀應用程序核心
   */
  dispose(): void {
    console.log('BuzzerAppCore: 開始銷毀應用程序');

    // 銷毀所有模組
    this.audioEngine.dispose();
    this.profileManager.dispose();
    this.patternManager.dispose();
    this.exportEngine.dispose();
    this.workflowManager.dispose();
    this.storageManager.dispose();

    // 清除事件監聽器
    this.eventListeners.clear();

    // 重置狀態
    this.appState.isInitialized = false;

    console.log('BuzzerAppCore: 應用程序銷毀完成');
  }
}