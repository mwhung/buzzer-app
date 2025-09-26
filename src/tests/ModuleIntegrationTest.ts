// 模組整合測試 - 驗證所有後端模組協同工作

import { BuzzerAppCore } from '../modules/core/BuzzerAppCore';
import { MusicTheory } from '../modules/music/MusicTheory';
import { WorkflowStages } from '../types';

/**
 * 模組整合測試套件
 */
export class ModuleIntegrationTest {
  private appCore: BuzzerAppCore;
  private testResults: Array<{ test: string; passed: boolean; message?: string; duration?: number }> = [];

  constructor() {
    this.appCore = new BuzzerAppCore({
      initialWorkflowStage: WorkflowStages.PROFILE_MANAGEMENT,
      defaultMasterVolume: 0.2 // 測試時使用較低音量
    });
  }

  /**
   * 執行所有整合測試
   */
  async runAllTests(): Promise<{ passed: number; failed: number; total: number; results: any[] }> {
    console.log('🧪 開始模組整合測試...');
    this.testResults = [];

    try {
      // 基礎初始化測試
      await this.testAppInitialization();
      await this.testModuleInitialization();

      // 音樂理論模組測試
      await this.testMusicTheoryModule();

      // Profile管理測試
      await this.testProfileManagement();

      // Pattern管理測試
      await this.testPatternManagement();

      // 工作流程管理測試
      await this.testWorkflowManagement();

      // 音頻引擎測試（模擬）
      await this.testAudioEngineIntegration();

      // 導出引擎測試（模擬）
      await this.testExportEngineIntegration();

      // 跨模組協作測試
      await this.testCrossModuleCollaboration();

      // 事件系統測試
      await this.testEventSystem();

      // 錯誤處理測試
      await this.testErrorHandling();

    } catch (error) {
      console.error('測試執行失敗:', error);
      this.addTestResult('整合測試執行', false, `測試執行異常: ${error}`);
    } finally {
      // 清理資源
      this.appCore.dispose();
    }

    // 生成測試報告
    const report = this.generateTestReport();
    console.log('📊 測試完成，結果:', report);

    return report;
  }

  /**
   * 測試應用核心初始化
   */
  private async testAppInitialization(): Promise<void> {
    const startTime = Date.now();

    try {
      await this.appCore.initialize();

      const appState = this.appCore.getAppState();
      const isInitialized = this.appCore.isInitialized();

      this.addTestResult(
        '應用核心初始化',
        isInitialized && appState.isInitialized,
        isInitialized ? '初始化成功' : '初始化失敗',
        Date.now() - startTime
      );

    } catch (error) {
      this.addTestResult('應用核心初始化', false, `初始化異常: ${error}`, Date.now() - startTime);
    }
  }

  /**
   * 測試各模組初始化狀態
   */
  private async testModuleInitialization(): Promise<void> {
    const startTime = Date.now();

    try {
      // 檢查所有模組是否正確初始化
      const audioEngine = this.appCore.audioEngine;
      const profileManager = this.appCore.profileManager;
      const patternManager = this.appCore.patternManager;
      const exportEngine = this.appCore.exportEngine;
      const workflowManager = this.appCore.workflowManager;

      const allModulesInitialized = !!(
        audioEngine &&
        profileManager &&
        patternManager &&
        exportEngine &&
        workflowManager
      );

      this.addTestResult(
        '模組初始化',
        allModulesInitialized,
        allModulesInitialized ? '所有模組初始化成功' : '部分模組初始化失敗',
        Date.now() - startTime
      );

    } catch (error) {
      this.addTestResult('模組初始化', false, `模組初始化異常: ${error}`, Date.now() - startTime);
    }
  }

  /**
   * 測試音樂理論模組
   */
  private async testMusicTheoryModule(): Promise<void> {
    const startTime = Date.now();

    try {
      // 測試音符轉頻率
      const a4Frequency = MusicTheory.noteToFrequency('A', 4);
      const frequencyTest = Math.abs(a4Frequency - 440) < 0.1;

      // 測試頻率轉音符
      const note = MusicTheory.frequencyToNote(440);
      const noteTest = note.name === 'A' && note.octave === 4;

      // 測試八度調整
      const adjustedNote = MusicTheory.adjustOctave(note, 1);
      const octaveTest = adjustedNote.octave === 5 && Math.abs(adjustedNote.frequency - 880) < 1;

      // 測試調性
      const cMajorNotes = MusicTheory.getKeyNotes({ tonic: 'C', mode: 'major', notes: [] });
      const keyTest = cMajorNotes.length === 7 && cMajorNotes[0] === 'C';

      const allMusicTheoryTests = frequencyTest && noteTest && octaveTest && keyTest;

      this.addTestResult(
        '音樂理論模組',
        allMusicTheoryTests,
        `頻率轉換:${frequencyTest}, 音符識別:${noteTest}, 八度調整:${octaveTest}, 調性:${keyTest}`,
        Date.now() - startTime
      );

    } catch (error) {
      this.addTestResult('音樂理論模組', false, `音樂理論測試異常: ${error}`, Date.now() - startTime);
    }
  }

  /**
   * 測試Profile管理
   */
  private async testProfileManagement(): Promise<void> {
    const startTime = Date.now();

    try {
      const profileManager = this.appCore.profileManager;

      // 測試默認profile存在
      const defaultProfile = profileManager.getCurrentProfile();
      const hasDefaultProfile = defaultProfile && defaultProfile.buzzer_name === 'Default Buzzer';

      // 測試添加新profile
      const testProfile = {
        buzzer_name: 'Test Buzzer',
        frequencies: [440, 880, 1320],
        spl_values: [60, 55, 50]
      };

      const newProfileId = profileManager.addProfile(testProfile);
      const addProfileTest = !!newProfileId;

      // 測試切換profile
      const switchSuccess = profileManager.setCurrentProfile(newProfileId);
      const currentProfile = profileManager.getCurrentProfile();
      const switchTest = switchSuccess && currentProfile?.buzzer_name === 'Test Buzzer';

      // 測試profile統計
      const stats = profileManager.getProfileStats(newProfileId);
      const statsTest = stats && stats.totalPoints === 3;

      const allProfileTests = hasDefaultProfile && addProfileTest && switchTest && statsTest;

      this.addTestResult(
        'Profile管理',
        allProfileTests,
        `默認Profile:${hasDefaultProfile}, 添加:${addProfileTest}, 切換:${switchTest}, 統計:${statsTest}`,
        Date.now() - startTime
      );

    } catch (error) {
      this.addTestResult('Profile管理', false, `Profile管理測試異常: ${error}`, Date.now() - startTime);
    }
  }

  /**
   * 測試Pattern管理
   */
  private async testPatternManagement(): Promise<void> {
    const startTime = Date.now();

    try {
      const patternManager = this.appCore.patternManager;

      // 測試默認patterns存在
      const allPatterns = patternManager.getAllPatterns();
      const hasDefaultPatterns = allPatterns.length >= 2;

      // 測試創建新pattern
      const testPatternId = patternManager.createPattern({
        name: 'Test Pattern',
        pattern: [[440, 200], [880, 300], [0, 100]],
        createdAt: new Date().toISOString()
      });
      const createTest = !!testPatternId;

      // 測試pattern統計
      const stats = patternManager.getPatternStats(testPatternId);
      const statsTest = stats && stats.stepCount === 3 && stats.totalDuration === 600;

      // 測試八度調整
      const adjustSuccess = patternManager.adjustPatternOctave(testPatternId, [0, 1], 1);
      const adjustTest = adjustSuccess;

      // 測試步驟編輯
      const updateSuccess = patternManager.updateStep(testPatternId, 0, [523, 250]);
      const updateTest = updateSuccess;

      const allPatternTests = hasDefaultPatterns && createTest && statsTest && adjustTest && updateTest;

      this.addTestResult(
        'Pattern管理',
        allPatternTests,
        `默認Patterns:${hasDefaultPatterns}, 創建:${createTest}, 統計:${statsTest}, 八度調整:${adjustTest}, 編輯:${updateTest}`,
        Date.now() - startTime
      );

    } catch (error) {
      this.addTestResult('Pattern管理', false, `Pattern管理測試異常: ${error}`, Date.now() - startTime);
    }
  }

  /**
   * 測試工作流程管理
   */
  private async testWorkflowManagement(): Promise<void> {
    const startTime = Date.now();

    try {
      const workflowManager = this.appCore.workflowManager;

      // 測試初始階段
      const initialStage = workflowManager.getCurrentStage();
      const initialTest = initialStage === WorkflowStages.PROFILE_MANAGEMENT;

      // 測試階段切換
      const switchSuccess = await workflowManager.goToStage(WorkflowStages.DESIGN_WORKBENCH);
      const currentStage = workflowManager.getCurrentStage();
      const switchTest = switchSuccess && currentStage === WorkflowStages.DESIGN_WORKBENCH;

      // 測試返回功能
      const backSuccess = await workflowManager.goBack();
      const backStage = workflowManager.getCurrentStage();
      const backTest = backSuccess && backStage === WorkflowStages.PROFILE_MANAGEMENT;

      // 測試前進功能
      const nextSuccess = await workflowManager.goNext();
      const nextStage = workflowManager.getCurrentStage();
      const nextTest = nextSuccess && nextStage === WorkflowStages.DESIGN_WORKBENCH;

      // 測試進度計算
      const progress = workflowManager.getProgress();
      const progressTest = progress > 0 && progress <= 100;

      const allWorkflowTests = initialTest && switchTest && backTest && nextTest && progressTest;

      this.addTestResult(
        '工作流程管理',
        allWorkflowTests,
        `初始階段:${initialTest}, 切換:${switchTest}, 返回:${backTest}, 前進:${nextTest}, 進度:${progressTest}`,
        Date.now() - startTime
      );

    } catch (error) {
      this.addTestResult('工作流程管理', false, `工作流程管理測試異常: ${error}`, Date.now() - startTime);
    }
  }

  /**
   * 測試音頻引擎整合（模擬測試，不播放真實音頻）
   */
  private async testAudioEngineIntegration(): Promise<void> {
    const startTime = Date.now();

    try {
      const audioEngine = this.appCore.audioEngine;
      const profileManager = this.appCore.profileManager;

      // 測試音量控制
      audioEngine.setMasterVolume(0.5);
      const volumeTest = audioEngine.getMasterVolume() === 0.5;

      // 測試音量計算
      const currentProfile = profileManager.getCurrentProfile();
      if (currentProfile) {
        const testFreq = currentProfile.frequencies[0];
        const calculatedVolume = audioEngine.calculateVolume(testFreq, currentProfile);
        const volumeCalcTest = calculatedVolume > 0 && calculatedVolume <= 1;

        this.addTestResult(
          '音頻引擎整合',
          volumeTest && volumeCalcTest,
          `音量控制:${volumeTest}, 音量計算:${volumeCalcTest}`,
          Date.now() - startTime
        );
      } else {
        this.addTestResult('音頻引擎整合', false, '沒有可用的Profile進行測試', Date.now() - startTime);
      }

    } catch (error) {
      this.addTestResult('音頻引擎整合', false, `音頻引擎測試異常: ${error}`, Date.now() - startTime);
    }
  }

  /**
   * 測試導出引擎整合（模擬測試）
   */
  private async testExportEngineIntegration(): Promise<void> {
    const startTime = Date.now();

    try {
      const exportEngine = this.appCore.exportEngine;

      // 測試支援格式
      const formats = exportEngine.getSupportedFormats();
      const formatsTest = formats.length >= 3;

      // 測試品質選項
      const qualities = exportEngine.getQualityOptions();
      const qualitiesTest = qualities.length >= 3;

      // 測試導出時間估算
      const patterns = this.appCore.patternManager.getAllPatterns();
      const estimatedTime = exportEngine.estimateExportTime(patterns, 'wav');
      const estimateTest = estimatedTime > 0;

      const allExportTests = formatsTest && qualitiesTest && estimateTest;

      this.addTestResult(
        '導出引擎整合',
        allExportTests,
        `格式支援:${formatsTest}, 品質選項:${qualitiesTest}, 時間估算:${estimateTest}`,
        Date.now() - startTime
      );

    } catch (error) {
      this.addTestResult('導出引擎整合', false, `導出引擎測試異常: ${error}`, Date.now() - startTime);
    }
  }

  /**
   * 測試跨模組協作
   */
  private async testCrossModuleCollaboration(): Promise<void> {
    const startTime = Date.now();

    try {
      // 測試應用統計（需要多個模組協作）
      const stats = this.appCore.getAppStatistics();
      const statsTest = stats && stats.profileCount > 0 && stats.patternCount > 0;

      // 測試應用狀態同步
      const appState = this.appCore.getAppState();
      const stateTest = appState && appState.isInitialized;

      // 測試工作流程階段數據
      const workflowState = this.appCore.workflowManager.getWorkflowState();
      const workflowDataTest = workflowState.stageData.size > 0;

      const allCollaborationTests = statsTest && stateTest && workflowDataTest;

      this.addTestResult(
        '跨模組協作',
        allCollaborationTests,
        `統計功能:${statsTest}, 狀態同步:${stateTest}, 工作流程數據:${workflowDataTest}`,
        Date.now() - startTime
      );

    } catch (error) {
      this.addTestResult('跨模組協作', false, `跨模組協作測試異常: ${error}`, Date.now() - startTime);
    }
  }

  /**
   * 測試事件系統
   */
  private async testEventSystem(): Promise<void> {
    const startTime = Date.now();

    try {
      let eventReceived = false;
      let profileEventReceived = false;

      // 測試應用事件
      this.appCore.addEventListener('profile-changed', () => {
        eventReceived = true;
      });

      // 測試Profile事件
      this.appCore.profileManager.addEventListener('select', () => {
        profileEventReceived = true;
      });

      // 觸發事件
      const profiles = this.appCore.profileManager.getAllProfiles();
      if (profiles.length > 0) {
        this.appCore.profileManager.setCurrentProfile(profiles[0].id);
      }

      // 等待事件處理
      await new Promise(resolve => setTimeout(resolve, 100));

      const eventTest = eventReceived && profileEventReceived;

      this.addTestResult(
        '事件系統',
        eventTest,
        `應用事件:${eventReceived}, Profile事件:${profileEventReceived}`,
        Date.now() - startTime
      );

    } catch (error) {
      this.addTestResult('事件系統', false, `事件系統測試異常: ${error}`, Date.now() - startTime);
    }
  }

  /**
   * 測試錯誤處理
   */
  private async testErrorHandling(): Promise<void> {
    const startTime = Date.now();

    try {
      // 測試無效工作流程切換
      const invalidSwitch = await this.appCore.workflowManager.goToStage('invalid-stage' as any);
      const invalidSwitchTest = !invalidSwitch;

      // 測試無效Profile
      const invalidProfile = this.appCore.profileManager.getProfile('non-existent-id');
      const invalidProfileTest = !invalidProfile;

      // 測試無效Pattern
      const invalidPattern = this.appCore.patternManager.getPattern('non-existent-id');
      const invalidPatternTest = !invalidPattern;

      const allErrorTests = invalidSwitchTest && invalidProfileTest && invalidPatternTest;

      this.addTestResult(
        '錯誤處理',
        allErrorTests,
        `無效切換:${invalidSwitchTest}, 無效Profile:${invalidProfileTest}, 無效Pattern:${invalidPatternTest}`,
        Date.now() - startTime
      );

    } catch (error) {
      this.addTestResult('錯誤處理', false, `錯誤處理測試異常: ${error}`, Date.now() - startTime);
    }
  }

  /**
   * 添加測試結果
   */
  private addTestResult(testName: string, passed: boolean, message?: string, duration?: number): void {
    this.testResults.push({
      test: testName,
      passed,
      message,
      duration
    });

    const status = passed ? '✅' : '❌';
    const timeInfo = duration ? ` (${duration}ms)` : '';
    console.log(`${status} ${testName}${timeInfo}: ${message || ''}`);
  }

  /**
   * 生成測試報告
   */
  private generateTestReport(): { passed: number; failed: number; total: number; results: any[] } {
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;

    return {
      passed,
      failed,
      total,
      results: this.testResults
    };
  }

  /**
   * 獲取詳細測試報告
   */
  getDetailedReport(): string {
    const report = this.generateTestReport();
    const passRate = ((report.passed / report.total) * 100).toFixed(1);

    let output = `\n📊 模組整合測試報告\n`;
    output += `==========================================\n`;
    output += `總計: ${report.total} 項測試\n`;
    output += `通過: ${report.passed} 項 (${passRate}%)\n`;
    output += `失敗: ${report.failed} 項\n\n`;

    output += `詳細結果:\n`;
    output += `------------------------------------------\n`;

    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      output += `${index + 1}. ${status} ${result.test}${duration}\n`;
      if (result.message) {
        output += `   ${result.message}\n`;
      }
      output += `\n`;
    });

    return output;
  }
}