// 工作流程管理器 - 控制應用的工作階段切換和狀態管理

import { WorkflowStages, WorkflowStage } from '../../types';

export interface WorkflowState {
  currentStage: WorkflowStages;
  previousStage: WorkflowStages | undefined;
  stageHistory: WorkflowStages[];
  canGoBack: boolean;
  canGoNext: boolean;
  stageData: Map<WorkflowStages, any>;
}

export interface StageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
}

export interface WorkflowEvent {
  type: 'stage-enter' | 'stage-exit' | 'stage-change' | 'validation-failed';
  currentStage: WorkflowStages;
  previousStage?: WorkflowStages;
  nextStage?: WorkflowStages;
  data?: any;
  errors?: string[];
}

export class WorkflowManager {
  private workflowState: WorkflowState;
  private eventListeners: Map<string, ((event: WorkflowEvent) => void)[]> = new Map();

  // 工作流程階段定義
  private readonly stages: Map<WorkflowStages, WorkflowStage> = new Map([
    [WorkflowStages.PROFILE_MANAGEMENT, {
      id: WorkflowStages.PROFILE_MANAGEMENT,
      name: 'Profile管理',
      component: 'ProfileManager',
      canGoBack: false, // 第一階段無法返回
      canGoNext: true
    }],
    [WorkflowStages.DESIGN_WORKBENCH, {
      id: WorkflowStages.DESIGN_WORKBENCH,
      name: '設計工作台',
      component: 'DesignWorkbench',
      canGoBack: true,
      canGoNext: true
    }],
    [WorkflowStages.EXPORT_MANAGER, {
      id: WorkflowStages.EXPORT_MANAGER,
      name: '導出管理',
      component: 'ExportManager',
      canGoBack: true,
      canGoNext: false // 最後階段無下一步
    }]
  ]);

  // 階段轉換規則
  private readonly transitionRules: Map<WorkflowStages, WorkflowStages[]> = new Map([
    [WorkflowStages.PROFILE_MANAGEMENT, [WorkflowStages.DESIGN_WORKBENCH]],
    [WorkflowStages.DESIGN_WORKBENCH, [WorkflowStages.PROFILE_MANAGEMENT, WorkflowStages.EXPORT_MANAGER]],
    [WorkflowStages.EXPORT_MANAGER, [WorkflowStages.DESIGN_WORKBENCH]]
  ]);

  constructor(initialStage: WorkflowStages = WorkflowStages.PROFILE_MANAGEMENT) {
    this.workflowState = {
      currentStage: initialStage,
      previousStage: undefined,
      stageHistory: [initialStage],
      canGoBack: false,
      canGoNext: true,
      stageData: new Map()
    };

    this.updateNavigationState();
    console.log(`WorkflowManager: 初始化完成，當前階段: ${initialStage}`);
  }

  /**
   * 切換到指定階段
   */
  async goToStage(targetStage: WorkflowStages, data?: any): Promise<boolean> {
    console.log(`WorkflowManager: 嘗試切換到階段 ${targetStage}`);

    // 檢查是否為有效階段
    if (!this.stages.has(targetStage)) {
      console.error(`WorkflowManager: 未知階段 ${targetStage}`);
      return false;
    }

    // 檢查是否已在目標階段
    if (this.workflowState.currentStage === targetStage) {
      console.warn(`WorkflowManager: 已在階段 ${targetStage}`);
      return true;
    }

    // 檢查轉換規則
    if (!this.isTransitionAllowed(this.workflowState.currentStage, targetStage)) {
      console.error(`WorkflowManager: 不允許從 ${this.workflowState.currentStage} 切換到 ${targetStage}`);
      return false;
    }

    // 驗證當前階段是否可以離開
    const currentStageValidation = await this.validateStageExit(this.workflowState.currentStage);
    if (!currentStageValidation.canProceed) {
      console.error('WorkflowManager: 當前階段驗證失敗', currentStageValidation.errors);
      this.emitEvent({
        type: 'validation-failed',
        currentStage: this.workflowState.currentStage,
        nextStage: targetStage,
        errors: currentStageValidation.errors
      });
      return false;
    }

    // 執行階段切換
    const previousStage = this.workflowState.currentStage;

    // 觸發退出事件
    this.emitEvent({
      type: 'stage-exit',
      currentStage: previousStage,
      nextStage: targetStage,
      data
    });

    // 更新狀態
    this.workflowState.previousStage = previousStage;
    this.workflowState.currentStage = targetStage;
    this.workflowState.stageHistory.push(targetStage);

    // 保存階段數據
    if (data) {
      this.workflowState.stageData.set(targetStage, data);
    }

    // 更新導航狀態
    this.updateNavigationState();

    // 觸發進入事件
    this.emitEvent({
      type: 'stage-enter',
      currentStage: targetStage,
      previousStage,
      data
    });

    // 觸發變更事件
    this.emitEvent({
      type: 'stage-change',
      currentStage: targetStage,
      previousStage,
      data
    });

    console.log(`WorkflowManager: 成功切換到階段 ${targetStage}`);
    return true;
  }

  /**
   * 返回上一階段
   */
  async goBack(): Promise<boolean> {
    if (!this.workflowState.canGoBack) {
      console.warn('WorkflowManager: 當前階段無法返回');
      return false;
    }

    // 找到上一個不同的階段
    const history = [...this.workflowState.stageHistory].reverse();
    const currentStageIndex = history.indexOf(this.workflowState.currentStage);

    let previousStage: WorkflowStages | undefined = undefined;
    for (let i = currentStageIndex + 1; i < history.length; i++) {
      if (history[i] !== this.workflowState.currentStage) {
        previousStage = history[i];
        break;
      }
    }

    if (!previousStage) {
      // 如果歷史記錄中沒有找到，使用默認邏輯
      switch (this.workflowState.currentStage) {
        case WorkflowStages.DESIGN_WORKBENCH:
          previousStage = WorkflowStages.PROFILE_MANAGEMENT;
          break;
        case WorkflowStages.EXPORT_MANAGER:
          previousStage = WorkflowStages.DESIGN_WORKBENCH;
          break;
        default:
          console.warn('WorkflowManager: 無法確定上一階段');
          return false;
      }
    }

    return await this.goToStage(previousStage);
  }

  /**
   * 前進到下一階段
   */
  async goNext(): Promise<boolean> {
    if (!this.workflowState.canGoNext) {
      console.warn('WorkflowManager: 當前階段無法前進');
      return false;
    }

    // 確定下一階段
    let nextStage: WorkflowStages | null = null;

    switch (this.workflowState.currentStage) {
      case WorkflowStages.PROFILE_MANAGEMENT:
        nextStage = WorkflowStages.DESIGN_WORKBENCH;
        break;
      case WorkflowStages.DESIGN_WORKBENCH:
        nextStage = WorkflowStages.EXPORT_MANAGER;
        break;
      default:
        console.warn('WorkflowManager: 當前階段沒有下一階段');
        return false;
    }

    return await this.goToStage(nextStage);
  }

  /**
   * 驗證階段退出條件
   */
  private async validateStageExit(stage: WorkflowStages): Promise<StageValidationResult> {
    const result: StageValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      canProceed: true
    };

    switch (stage) {
      case WorkflowStages.PROFILE_MANAGEMENT:
        // Profile管理階段：確保至少有一個profile被選中
        const profileData = this.workflowState.stageData.get(WorkflowStages.PROFILE_MANAGEMENT);
        if (!profileData || !profileData.currentProfile) {
          result.errors.push('請選擇一個Buzzer Profile');
          result.isValid = false;
          result.canProceed = false;
        }
        break;

      case WorkflowStages.DESIGN_WORKBENCH:
        // 設計工作台階段：確保至少有一個pattern
        const workbenchData = this.workflowState.stageData.get(WorkflowStages.DESIGN_WORKBENCH);
        if (!workbenchData || !workbenchData.patterns || workbenchData.patterns.length === 0) {
          result.warnings.push('沒有創建任何Pattern，建議至少創建一個');
          // 警告不阻止繼續
        }
        break;

      case WorkflowStages.EXPORT_MANAGER:
        // 導出階段：通常無特殊限制
        break;

      default:
        console.warn(`WorkflowManager: 未知階段驗證 ${stage}`);
    }

    return result;
  }

  /**
   * 檢查階段轉換是否允許
   */
  private isTransitionAllowed(fromStage: WorkflowStages, toStage: WorkflowStages): boolean {
    const allowedTransitions = this.transitionRules.get(fromStage);
    return allowedTransitions ? allowedTransitions.includes(toStage) : false;
  }

  /**
   * 更新導航狀態
   */
  private updateNavigationState(): void {
    const currentStageInfo = this.stages.get(this.workflowState.currentStage);

    if (currentStageInfo) {
      this.workflowState.canGoBack = currentStageInfo.canGoBack;
      this.workflowState.canGoNext = currentStageInfo.canGoNext;
    }
  }

  /**
   * 獲取當前工作流程狀態
   */
  getWorkflowState(): WorkflowState {
    return { ...this.workflowState };
  }

  /**
   * 獲取當前階段
   */
  getCurrentStage(): WorkflowStages {
    return this.workflowState.currentStage;
  }

  /**
   * 獲取階段信息
   */
  getStageInfo(stage: WorkflowStages): WorkflowStage | null {
    return this.stages.get(stage) || null;
  }

  /**
   * 獲取所有階段
   */
  getAllStages(): WorkflowStage[] {
    return Array.from(this.stages.values());
  }

  /**
   * 設置階段數據
   */
  setStageData(stage: WorkflowStages, data: any): void {
    this.workflowState.stageData.set(stage, data);
    console.log(`WorkflowManager: 設置階段數據 ${stage}`, data);
  }

  /**
   * 獲取階段數據
   */
  getStageData(stage: WorkflowStages): any {
    return this.workflowState.stageData.get(stage);
  }

  /**
   * 獲取當前階段數據
   */
  getCurrentStageData(): any {
    return this.getStageData(this.workflowState.currentStage);
  }

  /**
   * 清除階段數據
   */
  clearStageData(stage: WorkflowStages): void {
    this.workflowState.stageData.delete(stage);
    console.log(`WorkflowManager: 清除階段數據 ${stage}`);
  }

  /**
   * 重置工作流程
   */
  reset(): void {
    console.log('WorkflowManager: 重置工作流程');

    this.workflowState = {
      currentStage: WorkflowStages.PROFILE_MANAGEMENT,
      previousStage: undefined,
      stageHistory: [WorkflowStages.PROFILE_MANAGEMENT],
      canGoBack: false,
      canGoNext: true,
      stageData: new Map()
    };

    this.updateNavigationState();

    this.emitEvent({
      type: 'stage-change',
      currentStage: WorkflowStages.PROFILE_MANAGEMENT,
      previousStage: this.workflowState.previousStage
    });
  }

  /**
   * 獲取階段進度百分比
   */
  getProgress(): number {
    const stages = Array.from(this.stages.keys());
    const currentIndex = stages.indexOf(this.workflowState.currentStage);
    return currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : 0;
  }

  /**
   * 獲取工作流程步驟信息
   */
  getWorkflowSteps(): Array<{
    stage: WorkflowStages;
    name: string;
    completed: boolean;
    current: boolean;
    accessible: boolean;
  }> {
    const stages = Array.from(this.stages.entries());
    const currentIndex = stages.findIndex(([stage]) => stage === this.workflowState.currentStage);

    return stages.map(([stage, info], index) => ({
      stage,
      name: info.name,
      completed: index < currentIndex,
      current: index === currentIndex,
      accessible: Math.abs(index - currentIndex) <= 1 // 只能訪問相鄰階段
    }));
  }

  /**
   * 檢查是否可以訪問指定階段
   */
  canAccessStage(stage: WorkflowStages): boolean {
    // 總是可以訪問當前階段
    if (stage === this.workflowState.currentStage) {
      return true;
    }

    // 檢查轉換規則
    return this.isTransitionAllowed(this.workflowState.currentStage, stage);
  }

  /**
   * 事件監聽
   */
  addEventListener(eventType: string, callback: (event: WorkflowEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * 移除事件監聽
   */
  removeEventListener(eventType: string, callback: (event: WorkflowEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 觸發事件
   */
  private emitEvent(event: WorkflowEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }

    // 同時觸發通用事件
    const allListeners = this.eventListeners.get('*');
    if (allListeners) {
      allListeners.forEach(callback => callback(event));
    }
  }

  /**
   * 銷毀工作流程管理器
   */
  dispose(): void {
    this.eventListeners.clear();
    this.workflowState.stageData.clear();
    console.log('WorkflowManager: 已銷毀');
  }
}