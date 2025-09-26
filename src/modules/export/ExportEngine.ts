// 導出引擎 - 處理批量導出、格式轉換和進度管理

import { Pattern, Buzzer, ExportOptions } from '../../types';
import { AudioEngine } from '../audio/AudioEngine';

export interface ExportTask {
  id: string;
  patternId: string;
  patternName: string;
  format: 'wav' | 'json' | 'both';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: {
    wavBlob?: Blob;
    jsonData?: string;
    filename?: string;
  };
}

export interface ExportProgress {
  currentTask: number;
  totalTasks: number;
  currentTaskProgress: number;
  overallProgress: number;
  status: string;
  errors: string[];
}

export class ExportEngine {
  private audioEngine: AudioEngine;
  private exportTasks: Map<string, ExportTask> = new Map();
  private isExporting: boolean = false;
  private currentExportId: string | null = null;

  // 事件監聽器
  private progressListeners: ((progress: ExportProgress) => void)[] = [];
  private completeListeners: ((results: ExportTask[]) => void)[] = [];

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
  }

  /**
   * 批量導出patterns
   */
  async exportPatterns(
    patterns: Pattern[],
    buzzerProfile: Buzzer,
    options: ExportOptions = { format: 'both', quality: 'high' }
  ): Promise<ExportTask[]> {
    if (this.isExporting) {
      throw new Error('ExportEngine: 已有導出任務在進行中');
    }

    this.isExporting = true;
    this.currentExportId = this.generateExportId();
    this.exportTasks.clear();

    // 創建導出任務
    const tasks: ExportTask[] = patterns.map(pattern => ({
      id: this.generateTaskId(),
      patternId: pattern.id || '',
      patternName: pattern.name,
      format: options.format,
      status: 'pending',
      progress: 0
    }));

    // 存儲任務
    tasks.forEach(task => this.exportTasks.set(task.id, task));

    console.log(`ExportEngine: 開始批量導出 ${tasks.length} 個patterns`);

    const results: ExportTask[] = [];
    const totalTasks = tasks.length;

    try {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const pattern = patterns[i];

        // 更新進度
        this.emitProgress({
          currentTask: i + 1,
          totalTasks,
          currentTaskProgress: 0,
          overallProgress: (i / totalTasks) * 100,
          status: `正在處理: ${task.patternName}`,
          errors: []
        });

        // 處理單個任務
        const result = await this.processSingleTask(task, pattern, buzzerProfile, options);
        results.push(result);

        // 更新任務狀態
        this.exportTasks.set(task.id, result);

        // 小延遲以避免瀏覽器阻塞
        await this.delay(100);
      }

      // 完成所有任務
      this.emitProgress({
        currentTask: totalTasks,
        totalTasks,
        currentTaskProgress: 100,
        overallProgress: 100,
        status: '導出完成！',
        errors: results.filter(r => r.status === 'failed').map(r => r.error || '未知錯誤')
      });

      this.emitComplete(results);

    } catch (error) {
      console.error('ExportEngine: 批量導出失敗', error);
      this.emitProgress({
        currentTask: 0,
        totalTasks,
        currentTaskProgress: 0,
        overallProgress: 0,
        status: '導出失敗',
        errors: [error instanceof Error ? error.message : '未知錯誤']
      });
    } finally {
      this.isExporting = false;
      this.currentExportId = null;
    }

    return results;
  }

  /**
   * 處理單個導出任務
   */
  private async processSingleTask(
    task: ExportTask,
    pattern: Pattern,
    buzzerProfile: Buzzer,
    options: ExportOptions
  ): Promise<ExportTask> {
    const updatedTask = { ...task };

    try {
      updatedTask.status = 'processing';
      updatedTask.progress = 0;

      const result: NonNullable<ExportTask['result']> = {};

      if (task.format === 'wav' || task.format === 'both') {
        // 導出WAV
        updatedTask.progress = 25;
        console.log(`ExportEngine: 開始錄製音頻 - ${pattern.name}`);

        const wavBlob = await this.audioEngine.recordPatternToBlob(pattern, buzzerProfile);
        result.wavBlob = wavBlob;

        updatedTask.progress = 50;
      }

      if (task.format === 'json' || task.format === 'both') {
        // 導出JSON
        updatedTask.progress = task.format === 'both' ? 75 : 50;
        console.log(`ExportEngine: 生成JSON數據 - ${pattern.name}`);

        result.jsonData = JSON.stringify(pattern, null, 2);
        updatedTask.progress = 85;
      }

      // 生成文件名
      result.filename = this.generateFilename(pattern.name, task.format);
      updatedTask.progress = 100;
      updatedTask.status = 'completed';
      updatedTask.result = result;

      console.log(`ExportEngine: 任務完成 - ${pattern.name}`);

    } catch (error) {
      console.error(`ExportEngine: 任務失敗 - ${pattern.name}`, error);
      updatedTask.status = 'failed';
      updatedTask.error = error instanceof Error ? error.message : '未知錯誤';
    }

    return updatedTask;
  }

  /**
   * 下載導出的文件
   */
  async downloadExportResults(tasks: ExportTask[]): Promise<void> {
    const completedTasks = tasks.filter(task => task.status === 'completed' && task.result);

    for (const task of completedTasks) {
      const result = task.result!;

      if (task.format === 'wav' && result.wavBlob) {
        await this.downloadBlob(result.wavBlob, `${task.patternName}.wav`);
      }

      if (task.format === 'json' && result.jsonData) {
        const jsonBlob = new Blob([result.jsonData], { type: 'application/json' });
        await this.downloadBlob(jsonBlob, `${task.patternName}.json`);
      }

      if (task.format === 'both') {
        if (result.wavBlob) {
          await this.downloadBlob(result.wavBlob, `${task.patternName}.wav`);
        }
        if (result.jsonData) {
          const jsonBlob = new Blob([result.jsonData], { type: 'application/json' });
          await this.downloadBlob(jsonBlob, `${task.patternName}.json`);
        }
      }

      // 小延遲避免瀏覽器限制
      await this.delay(200);
    }

    console.log(`ExportEngine: 已下載 ${completedTasks.length} 個文件`);
  }

  /**
   * 創建ZIP包（高級功能）
   */
  async createZipArchive(tasks: ExportTask[]): Promise<Blob> {
    // 注意：這需要一個ZIP庫（如JSZip），這裡提供接口
    throw new Error('ExportEngine: ZIP功能需要額外的庫支持，暫未實現');

    // 實現示例（需要安裝JSZip）:
    // const JSZip = require('jszip');
    // const zip = new JSZip();
    //
    // tasks.forEach(task => {
    //   if (task.status === 'completed' && task.result) {
    //     const result = task.result;
    //     if (result.wavBlob) {
    //       zip.file(`${task.patternName}.wav`, result.wavBlob);
    //     }
    //     if (result.jsonData) {
    //       zip.file(`${task.patternName}.json`, result.jsonData);
    //     }
    //   }
    // });
    //
    // return await zip.generateAsync({ type: 'blob' });
  }

  /**
   * 導出單個pattern
   */
  async exportSinglePattern(
    pattern: Pattern,
    buzzerProfile: Buzzer,
    format: 'wav' | 'json' = 'wav'
  ): Promise<Blob> {
    console.log(`ExportEngine: 單個導出 - ${pattern.name} (${format})`);

    if (format === 'wav') {
      return await this.audioEngine.recordPatternToBlob(pattern, buzzerProfile);
    } else {
      const jsonData = JSON.stringify(pattern, null, 2);
      return new Blob([jsonData], { type: 'application/json' });
    }
  }

  /**
   * 獲取支援的導出格式
   */
  getSupportedFormats(): { format: string; description: string; extension: string }[] {
    return [
      { format: 'wav', description: 'WAV音頻文件', extension: '.wav' },
      { format: 'json', description: 'JSON Pattern文件', extension: '.json' },
      { format: 'both', description: 'WAV + JSON', extension: '.wav & .json' }
    ];
  }

  /**
   * 獲取品質設定選項
   */
  getQualityOptions(): { quality: string; description: string; sampleRate: number; bitDepth: number }[] {
    return [
      { quality: 'high', description: '高品質 (44.1kHz/16-bit)', sampleRate: 44100, bitDepth: 16 },
      { quality: 'medium', description: '中品質 (22kHz/16-bit)', sampleRate: 22050, bitDepth: 16 },
      { quality: 'low', description: '低品質 (11kHz/8-bit)', sampleRate: 11025, bitDepth: 8 }
    ];
  }

  /**
   * 估算導出時間
   */
  estimateExportTime(patterns: Pattern[], format: 'wav' | 'json' | 'both'): number {
    const wavTimePerPattern = 2000; // 2秒每個WAV
    const jsonTimePerPattern = 100;  // 0.1秒每個JSON

    let timePerPattern = 0;

    switch (format) {
      case 'wav':
        timePerPattern = wavTimePerPattern;
        break;
      case 'json':
        timePerPattern = jsonTimePerPattern;
        break;
      case 'both':
        timePerPattern = wavTimePerPattern + jsonTimePerPattern;
        break;
    }

    return patterns.length * timePerPattern;
  }

  /**
   * 取消當前導出
   */
  cancelExport(): void {
    if (!this.isExporting) {
      console.warn('ExportEngine: 沒有正在進行的導出任務');
      return;
    }

    console.log('ExportEngine: 取消導出任務');
    this.isExporting = false;
    this.currentExportId = null;

    this.emitProgress({
      currentTask: 0,
      totalTasks: this.exportTasks.size,
      currentTaskProgress: 0,
      overallProgress: 0,
      status: '導出已取消',
      errors: ['用戶取消了導出操作']
    });
  }

  /**
   * 檢查是否正在導出
   */
  isCurrentlyExporting(): boolean {
    return this.isExporting;
  }

  /**
   * 獲取當前導出進度
   */
  getCurrentExportTasks(): ExportTask[] {
    return Array.from(this.exportTasks.values());
  }

  /**
   * 清理資源
   */
  dispose(): void {
    this.cancelExport();
    this.exportTasks.clear();
    this.progressListeners = [];
    this.completeListeners = [];
    console.log('ExportEngine: 已銷毀');
  }

  // === 私有工具方法 ===

  /**
   * 生成導出ID
   */
  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成任務ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成文件名
   */
  private generateFilename(patternName: string, format: string): string {
    const cleanName = patternName.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    switch (format) {
      case 'wav':
        return `${cleanName}_${timestamp}.wav`;
      case 'json':
        return `${cleanName}_${timestamp}.json`;
      case 'both':
        return `${cleanName}_${timestamp}`;
      default:
        return `${cleanName}_${timestamp}`;
    }
  }

  /**
   * 下載Blob文件
   */
  private async downloadBlob(blob: Blob, filename: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      // 小延遲確保下載開始
      setTimeout(resolve, 100);
    });
  }

  /**
   * 延遲工具
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 觸發進度事件
   */
  private emitProgress(progress: ExportProgress): void {
    this.progressListeners.forEach(listener => listener(progress));
  }

  /**
   * 觸發完成事件
   */
  private emitComplete(results: ExportTask[]): void {
    this.completeListeners.forEach(listener => listener(results));
  }

  // === 事件監聽API ===

  /**
   * 監聽進度更新
   */
  onProgress(callback: (progress: ExportProgress) => void): void {
    this.progressListeners.push(callback);
  }

  /**
   * 監聽導出完成
   */
  onComplete(callback: (results: ExportTask[]) => void): void {
    this.completeListeners.push(callback);
  }

  /**
   * 移除進度監聽
   */
  removeProgressListener(callback: (progress: ExportProgress) => void): void {
    const index = this.progressListeners.indexOf(callback);
    if (index > -1) {
      this.progressListeners.splice(index, 1);
    }
  }

  /**
   * 移除完成監聽
   */
  removeCompleteListener(callback: (results: ExportTask[]) => void): void {
    const index = this.completeListeners.indexOf(callback);
    if (index > -1) {
      this.completeListeners.splice(index, 1);
    }
  }
}