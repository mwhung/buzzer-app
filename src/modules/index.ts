// 模組統一導出入口

// 類型定義
export * from '../types';

// 核心應用類
export { BuzzerAppCore, type BuzzerAppConfig, type AppState } from './core/BuzzerAppCore';

// 音樂理論模組
export { MusicTheory } from './music/MusicTheory';

// 音頻引擎模組
export { AudioEngine } from './audio/AudioEngine';

// Profile管理模組
export { ProfileManager, type ProfileValidationResult } from './profile/ProfileManager';

// Pattern管理模組
export { PatternManager, type PatternValidationResult, type PatternStats } from './pattern/PatternManager';

// 導出引擎模組
export { ExportEngine, type ExportTask, type ExportProgress } from './export/ExportEngine';

// 工作流程管理模組
export {
  WorkflowManager,
  type WorkflowState,
  type StageValidationResult,
  type WorkflowEvent
} from './workflow/WorkflowManager';