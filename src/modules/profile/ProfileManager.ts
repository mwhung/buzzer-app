// Profile管理器 - 處理Buzzer Profile的CRUD、驗證和文件操作

import { Buzzer, ProfileEvent } from '../../types';

export interface ProfileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ProfileManager {
  private profiles: Map<string, Buzzer> = new Map();
  private currentProfileId: string | null = null;
  private eventListeners: Map<string, ((event: ProfileEvent) => void)[]> = new Map();

  constructor() {
    // 載入預設profile
    this.loadDefaultProfile();
  }

  /**
   * 載入預設buzzer profile
   */
  private loadDefaultProfile(): void {
    const defaultProfile: Buzzer = {
      buzzer_name: "Default Buzzer",
      frequencies: [440, 466, 494, 523, 554, 587, 622, 659, 699, 740, 784, 831, 880, 932, 988, 1047, 1109, 1175, 1245, 1319, 1398, 1480, 1568, 1661, 1760, 1865, 1976, 2093, 2217, 2349, 2489, 2637, 2794, 2960, 3136, 3322, 3520, 3729, 3951, 4186, 4435, 4699, 4978, 5274, 5588, 5920, 6272, 6645, 7040],
      spl_values: [49.7, 50.4, 48, 48.2, 51.2, 52.3, 51.1, 48.3, 46.2, 49.4, 53.3, 54.8, 54.1, 49.8, 48.3, 49, 51.2, 51.5, 56.1, 58.5, 59, 56.3, 49.1, 44.4, 47.7, 51.1, 53.1, 50.1, 48.9, 47.3, 49.9, 59.4, 59.9, 63.1, 64.3, 62.6, 63.2, 66.8, 70.3, 71.5, 68.7, 60.3, 47.9, 37.8, 51.9, 60.2, 53.5, 48.9, 50.8]
    };

    const defaultId = this.generateProfileId(defaultProfile.buzzer_name);
    this.profiles.set(defaultId, defaultProfile);
    this.currentProfileId = defaultId;

    console.log('ProfileManager: 預設profile載入完成');
  }

  /**
   * 生成profile ID
   */
  private generateProfileId(name: string): string {
    const timestamp = Date.now();
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${cleanName}_${timestamp}`;
  }

  /**
   * 驗證buzzer profile
   */
  validateProfile(profile: any): ProfileValidationResult {
    const result: ProfileValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 檢查必要字段
    if (!profile.buzzer_name || typeof profile.buzzer_name !== 'string') {
      result.errors.push('缺少有效的buzzer_name字段');
      result.isValid = false;
    }

    if (!Array.isArray(profile.frequencies)) {
      result.errors.push('frequencies字段必須是數組');
      result.isValid = false;
    }

    if (!Array.isArray(profile.spl_values)) {
      result.errors.push('spl_values字段必須是數組');
      result.isValid = false;
    }

    if (result.isValid) {
      // 檢查數組長度是否匹配
      if (profile.frequencies.length !== profile.spl_values.length) {
        result.errors.push('frequencies和spl_values數組長度必須相同');
        result.isValid = false;
      }

      // 檢查頻率值
      const invalidFreqs = profile.frequencies.filter((freq: any) =>
        typeof freq !== 'number' || freq <= 0 || freq > 20000
      );
      if (invalidFreqs.length > 0) {
        result.warnings.push(`發現${invalidFreqs.length}個無效頻率值（應在0-20000Hz之間）`);
      }

      // 檢查SPL值
      const invalidSPLs = profile.spl_values.filter((spl: any) =>
        typeof spl !== 'number' || spl < 0 || spl > 120
      );
      if (invalidSPLs.length > 0) {
        result.warnings.push(`發現${invalidSPLs.length}個可疑SPL值（通常在0-120dB之間）`);
      }

      // 檢查頻率排序
      const sortedFreqs = [...profile.frequencies].sort((a, b) => a - b);
      if (JSON.stringify(sortedFreqs) !== JSON.stringify(profile.frequencies)) {
        result.warnings.push('頻率建議按升序排列以獲得最佳性能');
      }

      // 檢查重複頻率
      const uniqueFreqs = new Set(profile.frequencies);
      if (uniqueFreqs.size !== profile.frequencies.length) {
        result.warnings.push('發現重複的頻率值');
      }
    }

    return result;
  }

  /**
   * 添加新的profile
   */
  addProfile(profile: Buzzer): string {
    const validation = this.validateProfile(profile);

    if (!validation.isValid) {
      throw new Error(`Profile驗證失敗: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('ProfileManager: Profile驗證警告:', validation.warnings);
    }

    const profileId = this.generateProfileId(profile.buzzer_name);
    this.profiles.set(profileId, { ...profile });

    this.emitEvent({
      type: 'create',
      profile: { ...profile },
      profileId
    });

    console.log(`ProfileManager: 添加profile成功 - ${profile.buzzer_name} (ID: ${profileId})`);
    return profileId;
  }

  /**
   * 從JSON文件導入profile
   */
  async importProfileFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') {
            throw new Error('無法讀取文件內容');
          }

          const profileData = JSON.parse(result);
          const profileId = this.addProfile(profileData);

          this.emitEvent({
            type: 'import',
            profile: profileData,
            profileId
          });

          resolve(profileId);
        } catch (error) {
          reject(new Error(`導入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('文件讀取失敗'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * 導出profile為JSON
   */
  exportProfileToJSON(profileId: string): string {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile不存在: ${profileId}`);
    }

    return JSON.stringify(profile, null, 2);
  }

  /**
   * 獲取profile
   */
  getProfile(profileId: string): Buzzer | null {
    return this.profiles.get(profileId) || null;
  }

  /**
   * 獲取當前profile
   */
  getCurrentProfile(): Buzzer | null {
    if (!this.currentProfileId) return null;
    return this.getProfile(this.currentProfileId);
  }

  /**
   * 獲取當前profile ID
   */
  getCurrentProfileId(): string | null {
    return this.currentProfileId;
  }

  /**
   * 設置當前profile
   */
  setCurrentProfile(profileId: string): boolean {
    if (!this.profiles.has(profileId)) {
      console.error(`ProfileManager: Profile不存在 - ${profileId}`);
      return false;
    }

    const oldProfileId = this.currentProfileId;
    this.currentProfileId = profileId;

    const profile = this.profiles.get(profileId)!;

    this.emitEvent({
      type: 'select',
      profile: { ...profile },
      profileId
    });

    console.log(`ProfileManager: 切換profile - ${profile.buzzer_name} (ID: ${profileId})`);
    return true;
  }

  /**
   * 刪除profile
   */
  deleteProfile(profileId: string): boolean {
    if (!this.profiles.has(profileId)) {
      console.error(`ProfileManager: Profile不存在 - ${profileId}`);
      return false;
    }

    // 不能刪除當前使用的profile
    if (profileId === this.currentProfileId) {
      console.error('ProfileManager: 不能刪除當前使用的profile');
      return false;
    }

    const profile = this.profiles.get(profileId)!;
    this.profiles.delete(profileId);

    this.emitEvent({
      type: 'delete',
      profile: { ...profile },
      profileId
    });

    console.log(`ProfileManager: 刪除profile成功 - ${profile.buzzer_name} (ID: ${profileId})`);
    return true;
  }

  /**
   * 獲取所有profiles
   */
  getAllProfiles(): Array<{ id: string; profile: Buzzer }> {
    return Array.from(this.profiles.entries()).map(([id, profile]) => ({
      id,
      profile: { ...profile }
    }));
  }

  /**
   * 獲取profile統計信息
   */
  getProfileStats(profileId: string): {
    frequencyRange: [number, number];
    splRange: [number, number];
    totalPoints: number;
    avgSPL: number;
  } | null {
    const profile = this.profiles.get(profileId);
    if (!profile) return null;

    const frequencies = profile.frequencies;
    const splValues = profile.spl_values;

    return {
      frequencyRange: [Math.min(...frequencies), Math.max(...frequencies)],
      splRange: [Math.min(...splValues), Math.max(...splValues)],
      totalPoints: frequencies.length,
      avgSPL: splValues.reduce((sum, spl) => sum + spl, 0) / splValues.length
    };
  }

  /**
   * 搜索profiles
   */
  searchProfiles(query: string): Array<{ id: string; profile: Buzzer }> {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllProfiles().filter(({ profile }) =>
      profile.buzzer_name.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * 檢查profile名稱是否已存在
   */
  isProfileNameExists(name: string, excludeId?: string): boolean {
    return this.getAllProfiles().some(({ id, profile }) =>
      profile.buzzer_name === name && id !== excludeId
    );
  }

  /**
   * 更新profile
   */
  updateProfile(profileId: string, updates: Partial<Buzzer>): boolean {
    const existingProfile = this.profiles.get(profileId);
    if (!existingProfile) {
      console.error(`ProfileManager: Profile不存在 - ${profileId}`);
      return false;
    }

    const updatedProfile = { ...existingProfile, ...updates };
    const validation = this.validateProfile(updatedProfile);

    if (!validation.isValid) {
      console.error('ProfileManager: Profile更新驗證失敗', validation.errors);
      return false;
    }

    this.profiles.set(profileId, updatedProfile);
    console.log(`ProfileManager: Profile更新成功 - ${updatedProfile.buzzer_name}`);
    return true;
  }

  /**
   * 事件監聽
   */
  addEventListener(eventType: string, callback: (event: ProfileEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * 移除事件監聽
   */
  removeEventListener(eventType: string, callback: (event: ProfileEvent) => void): void {
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
  private emitEvent(event: ProfileEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  /**
   * 清理資源
   */
  dispose(): void {
    this.profiles.clear();
    this.eventListeners.clear();
    this.currentProfileId = null;
    console.log('ProfileManager: 已銷毀');
  }
}