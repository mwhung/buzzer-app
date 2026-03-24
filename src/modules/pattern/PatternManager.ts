// Pattern管理器 - 處理Pattern的CRUD、序列化和版本管理

import { Pattern, PatternEvent } from '../../types';
import { MusicTheory } from '../music/MusicTheory';

export interface PatternValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PatternStats {
  totalDuration: number;
  stepCount: number;
  frequencyRange: [number, number];
  uniqueFrequencies: number;
  silenceSteps: number;
}

export class PatternManager {
  private patterns: Map<string, Pattern> = new Map();
  private currentPatternId: string | null = null;
  private eventListeners: Map<string, ((event: PatternEvent) => void)[]> = new Map();

  constructor() {
    this.loadDefaultPatterns();
  }

  /**
   * 載入預設patterns
   */
  private loadDefaultPatterns(): void {
    const defaultPatterns: Omit<Pattern, 'id'>[] = [
      {
        name: "示例Pattern",
        notes: [],
        pattern: [
          [440, 200],
          [523, 300],
          [0, 100],
          [659, 150]
        ],
        createdAt: new Date().toISOString()
      },
      {
        name: "音量測試Pattern",
        notes: [],
        pattern: [
          [5274, 500],  // 最低音量 (37.8dB)
          [0, 200],     // 靜音間隔
          [440, 500],   // 低音量 (49.7dB)
          [0, 200],     // 靜音間隔
          [2960, 500],  // 高音量 (63.1dB)
          [0, 200],     // 靜音間隔
          [4186, 500],  // 最高音量 (71.5dB)
          [0, 200],     // 靜音間隔
          [1661, 500]   // 極低音量 (44.4dB)
        ],
        createdAt: new Date().toISOString()
      }
    ];

    defaultPatterns.forEach(pattern => {
      const id = this.generatePatternId(pattern.name);
      const fullPattern: Pattern = { ...pattern, id };
      this.patterns.set(id, fullPattern);
    });

    // 設置第一個為當前pattern
    const firstPatternId = Array.from(this.patterns.keys())[0];
    if (firstPatternId) {
      this.currentPatternId = firstPatternId;
    }

    console.log('PatternManager: 預設patterns載入完成');
  }

  /**
   * 生成pattern ID
   */
  private generatePatternId(name: string): string {
    const timestamp = Date.now();
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `pattern_${cleanName}_${timestamp}`;
  }

  /**
   * 驗證pattern
   */
  validatePattern(pattern: any): PatternValidationResult {
    const result: PatternValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 檢查基本字段
    if (!pattern.name || typeof pattern.name !== 'string') {
      result.errors.push('缺少有效的name字段');
      result.isValid = false;
    }

    if (!Array.isArray(pattern.pattern)) {
      result.errors.push('pattern字段必須是數組');
      result.isValid = false;
      return result;
    }

    // 檢查pattern數組內容
    pattern.pattern.forEach((step: any, index: number) => {
      if (!Array.isArray(step) || step.length !== 2) {
        result.errors.push(`步驟${index + 1}: 每個步驟必須是[頻率, 時長]格式`);
        result.isValid = false;
        return;
      }

      const [frequency, duration] = step;

      // 檢查頻率
      if (typeof frequency !== 'number' || frequency < 0) {
        result.errors.push(`步驟${index + 1}: 頻率必須是非負數字`);
        result.isValid = false;
      } else if (frequency > 0 && (frequency < 20 || frequency > 20000)) {
        result.warnings.push(`步驟${index + 1}: 頻率${frequency}Hz超出人耳可聽範圍(20-20000Hz)`);
      }

      // 檢查時長
      if (typeof duration !== 'number' || duration <= 0) {
        result.errors.push(`步驟${index + 1}: 時長必須是正數`);
        result.isValid = false;
      } else if (duration < 50) {
        result.warnings.push(`步驟${index + 1}: 時長${duration}ms可能太短，建議至少50ms`);
      } else if (duration > 10000) {
        result.warnings.push(`步驟${index + 1}: 時長${duration}ms可能太長`);
      }
    });

    // 檢查pattern長度
    if (pattern.pattern.length === 0) {
      result.errors.push('Pattern不能為空');
      result.isValid = false;
    } else if (pattern.pattern.length > 100) {
      result.warnings.push(`Pattern包含${pattern.pattern.length}個步驟，可能影響性能`);
    }

    // 檢查總時長
    const totalDuration = pattern.pattern.reduce((sum: number, [, duration]: [number, number]) => sum + duration, 0);
    if (totalDuration > 60000) {
      result.warnings.push(`Pattern總時長${(totalDuration / 1000).toFixed(1)}秒，可能太長`);
    }

    return result;
  }

  /**
   * 創建新pattern
   */
  createPattern(patternData: Omit<Pattern, 'id'>): string {
    const validation = this.validatePattern(patternData);

    if (!validation.isValid) {
      throw new Error(`Pattern驗證失敗: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('PatternManager: Pattern驗證警告:', validation.warnings);
    }

    const patternId = this.generatePatternId(patternData.name);
    const pattern: Pattern = {
      ...patternData,
      id: patternId,
      createdAt: patternData.createdAt || new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };

    this.patterns.set(patternId, pattern);

    this.emitEvent({
      type: 'create',
      pattern: { ...pattern },
      patternId
    });

    console.log(`PatternManager: 創建pattern成功 - ${pattern.name} (ID: ${patternId})`);
    return patternId;
  }

  /**
   * 從JSON導入pattern
   */
  importPatternFromJSON(jsonData: string): string {
    try {
      const patternData = JSON.parse(jsonData);

      // 移除id以確保重新生成
      const { id, ...patternWithoutId } = patternData;

      return this.createPattern({
        ...patternWithoutId,
        name: patternWithoutId.name || 'Imported Pattern',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`JSON導入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 從文件導入pattern
   */
  async importPatternFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') {
            throw new Error('無法讀取文件內容');
          }

          const patternId = this.importPatternFromJSON(result);
          resolve(patternId);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('文件讀取失敗'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * 導出pattern為JSON
   */
  exportPatternToJSON(patternId: string): string {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      throw new Error(`Pattern不存在: ${patternId}`);
    }

    return JSON.stringify(pattern, null, 2);
  }

  /**
   * 更新pattern
   */
  updatePattern(patternId: string, updates: Partial<Omit<Pattern, 'id'>>): boolean {
    const existingPattern = this.patterns.get(patternId);
    if (!existingPattern) {
      console.error(`PatternManager: Pattern不存在 - ${patternId}`);
      return false;
    }

    const updatedPattern = {
      ...existingPattern,
      ...updates,
      modifiedAt: new Date().toISOString()
    };

    const validation = this.validatePattern(updatedPattern);
    if (!validation.isValid) {
      console.error('PatternManager: Pattern更新驗證失敗', validation.errors);
      return false;
    }

    this.patterns.set(patternId, updatedPattern);

    this.emitEvent({
      type: 'update',
      pattern: { ...updatedPattern },
      patternId
    });

    console.log(`PatternManager: Pattern更新成功 - ${updatedPattern.name}`);
    return true;
  }

  /**
   * 刪除pattern
   */
  deletePattern(patternId: string): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      console.error(`PatternManager: Pattern不存在 - ${patternId}`);
      return false;
    }

    this.patterns.delete(patternId);

    // 如果刪除的是當前pattern，切換到另一個
    if (patternId === this.currentPatternId) {
      const remainingPatterns = Array.from(this.patterns.keys());
      this.currentPatternId = remainingPatterns.length > 0 ? remainingPatterns[0] : null;
    }

    this.emitEvent({
      type: 'delete',
      pattern: { ...pattern },
      patternId
    });

    console.log(`PatternManager: 刪除pattern成功 - ${pattern.name}`);
    return true;
  }

  /**
   * 複製pattern
   */
  duplicatePattern(patternId: string, newName?: string): string | null {
    const originalPattern = this.patterns.get(patternId);
    if (!originalPattern) {
      console.error(`PatternManager: Pattern不存在 - ${patternId}`);
      return null;
    }

    const duplicatedName = newName || `${originalPattern.name} (複製)`;

    return this.createPattern({
      name: duplicatedName,
      notes: [],
      pattern: [...originalPattern.pattern], // 深拷貝pattern數組
      createdAt: new Date().toISOString()
    });
  }

  /**
   * 獲取pattern
   */
  getPattern(patternId: string): Pattern | null {
    return this.patterns.get(patternId) || null;
  }

  /**
   * 獲取當前pattern
   */
  getCurrentPattern(): Pattern | null {
    if (!this.currentPatternId) return null;
    return this.getPattern(this.currentPatternId);
  }

  /**
   * 獲取當前pattern ID
   */
  getCurrentPatternId(): string | null {
    return this.currentPatternId;
  }

  /**
   * 設置當前pattern
   */
  setCurrentPattern(patternId: string): boolean {
    if (!this.patterns.has(patternId)) {
      console.error(`PatternManager: Pattern不存在 - ${patternId}`);
      return false;
    }

    this.currentPatternId = patternId;
    const pattern = this.patterns.get(patternId)!;

    this.emitEvent({
      type: 'select',
      pattern: { ...pattern },
      patternId
    });

    console.log(`PatternManager: 切換pattern - ${pattern.name}`);
    return true;
  }

  /**
   * 獲取所有patterns
   */
  getAllPatterns(): Pattern[] {
    return Array.from(this.patterns.values()).map(pattern => ({ ...pattern }));
  }

  /**
   * 搜索patterns
   */
  searchPatterns(query: string): Pattern[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllPatterns().filter(pattern =>
      pattern.name.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * 獲取pattern統計信息
   */
  getPatternStats(patternId: string): PatternStats | null {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return null;

    const frequencies = pattern.pattern.map(([freq]) => freq).filter(freq => freq > 0);
    const silenceSteps = pattern.pattern.filter(([freq]) => freq === 0).length;

    return {
      totalDuration: pattern.pattern.reduce((sum, [, duration]) => sum + duration, 0),
      stepCount: pattern.pattern.length,
      frequencyRange: frequencies.length > 0 ? [Math.min(...frequencies), Math.max(...frequencies)] : [0, 0],
      uniqueFrequencies: new Set(frequencies).size,
      silenceSteps
    };
  }

  /**
   * 調整pattern中音符的八度
   */
  adjustPatternOctave(patternId: string, stepIndices: number[], octaveChange: number): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      console.error(`PatternManager: Pattern不存在 - ${patternId}`);
      return false;
    }

    const updatedSteps = pattern.pattern.map((step, index) => {
      if (stepIndices.includes(index)) {
        const [frequency, duration] = step;
        if (frequency > 0) {
          const adjustedFrequency = MusicTheory.adjustFrequencyOctave(frequency, octaveChange);
          return [adjustedFrequency, duration] as [number, number];
        }
      }
      return step;
    });

    return this.updatePattern(patternId, { pattern: updatedSteps });
  }

  /**
   * 重新排序pattern步驟
   */
  reorderPatternSteps(patternId: string, newOrder: number[]): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      console.error(`PatternManager: Pattern不存在 - ${patternId}`);
      return false;
    }

    if (newOrder.length !== pattern.pattern.length) {
      console.error('PatternManager: 新順序數組長度不匹配');
      return false;
    }

    const reorderedSteps = newOrder.map(index => pattern.pattern[index]);
    return this.updatePattern(patternId, { pattern: reorderedSteps });
  }

  /**
   * 在指定位置插入步驟
   */
  insertStep(patternId: string, index: number, step: [number, number]): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      console.error(`PatternManager: Pattern不存在 - ${patternId}`);
      return false;
    }

    const newSteps = [...pattern.pattern];
    newSteps.splice(index, 0, step);

    return this.updatePattern(patternId, { pattern: newSteps });
  }

  /**
   * 刪除指定步驟
   */
  removeStep(patternId: string, index: number): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      console.error(`PatternManager: Pattern不存在 - ${patternId}`);
      return false;
    }

    if (index < 0 || index >= pattern.pattern.length) {
      console.error('PatternManager: 步驟索引超出範圍');
      return false;
    }

    const newSteps = pattern.pattern.filter((_, i) => i !== index);

    // 確保至少保留一個步驟
    if (newSteps.length === 0) {
      console.error('PatternManager: 不能刪除最後一個步驟');
      return false;
    }

    return this.updatePattern(patternId, { pattern: newSteps });
  }

  /**
   * 更新特定步驟
   */
  updateStep(patternId: string, index: number, step: [number, number]): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      console.error(`PatternManager: Pattern不存在 - ${patternId}`);
      return false;
    }

    if (index < 0 || index >= pattern.pattern.length) {
      console.error('PatternManager: 步驟索引超出範圍');
      return false;
    }

    const newSteps = [...pattern.pattern];
    newSteps[index] = step;

    return this.updatePattern(patternId, { pattern: newSteps });
  }

  /**
   * 檢查pattern名稱是否已存在
   */
  isPatternNameExists(name: string, excludeId?: string): boolean {
    return this.getAllPatterns().some(pattern =>
      pattern.name === name && pattern.id !== excludeId
    );
  }

  /**
   * 事件監聽
   */
  addEventListener(eventType: string, callback: (event: PatternEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * 移除事件監聽
   */
  removeEventListener(eventType: string, callback: (event: PatternEvent) => void): void {
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
  private emitEvent(event: PatternEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  /**
   * 清理資源
   */
  dispose(): void {
    this.patterns.clear();
    this.eventListeners.clear();
    this.currentPatternId = null;
    console.log('PatternManager: 已銷毀');
  }
}