// StorageManager - 使用 IndexedDB 持久化儲存 Buzzer Profiles 和 Patterns（含版本歷史）

import { Buzzer, Pattern } from '../../types';

export interface StoredProfile {
  id: string;
  profile: Buzzer;
  savedAt: string;
}

export interface StoredPattern {
  id: string;
  pattern: Pattern;
  savedAt: string;
}

export interface PatternVersion {
  versionId: string;
  patternId: string;
  pattern: Pattern;
  savedAt: string;
  label?: string;
}

export interface StorageStats {
  profileCount: number;
  patternCount: number;
  versionCount: number;
}

const DB_NAME = 'buzzer-app-storage';
const DB_VERSION = 1;

const STORE_PROFILES = 'profiles';
const STORE_PATTERNS = 'patterns';
const STORE_VERSIONS = 'pattern_versions';
const STORE_META = 'meta';

export class StorageManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化 IndexedDB
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Profiles store
        if (!db.objectStoreNames.contains(STORE_PROFILES)) {
          db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
        }

        // Patterns store
        if (!db.objectStoreNames.contains(STORE_PATTERNS)) {
          db.createObjectStore(STORE_PATTERNS, { keyPath: 'id' });
        }

        // Pattern versions store
        if (!db.objectStoreNames.contains(STORE_VERSIONS)) {
          const versionStore = db.createObjectStore(STORE_VERSIONS, { keyPath: 'versionId' });
          versionStore.createIndex('patternId', 'patternId', { unique: false });
          versionStore.createIndex('savedAt', 'savedAt', { unique: false });
        }

        // Meta store (for app settings like currentProfileId, currentPatternId)
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('StorageManager: IndexedDB 初始化完成');
        resolve();
      };

      request.onerror = (event) => {
        console.error('StorageManager: IndexedDB 初始化失敗', (event.target as IDBOpenDBRequest).error);
        this.initPromise = null;
        reject(new Error('IndexedDB 初始化失敗'));
      };
    });

    return this.initPromise;
  }

  private getDB(): IDBDatabase {
    if (!this.db) throw new Error('StorageManager 尚未初始化，請先呼叫 initialize()');
    return this.db;
  }

  // ──── Profile 操作 ────

  async saveProfile(id: string, profile: Buzzer): Promise<void> {
    const db = this.getDB();
    const record: StoredProfile = { id, profile, savedAt: new Date().toISOString() };
    return this.put(db, STORE_PROFILES, record);
  }

  async deleteProfile(id: string): Promise<void> {
    const db = this.getDB();
    return this.delete(db, STORE_PROFILES, id);
  }

  async getAllProfiles(): Promise<StoredProfile[]> {
    const db = this.getDB();
    return this.getAll<StoredProfile>(db, STORE_PROFILES);
  }

  // ──── Pattern 操作 ────

  async savePattern(id: string, pattern: Pattern): Promise<void> {
    const db = this.getDB();
    const record: StoredPattern = { id, pattern, savedAt: new Date().toISOString() };
    return this.put(db, STORE_PATTERNS, record);
  }

  async deletePattern(id: string): Promise<void> {
    const db = this.getDB();
    // 同時刪除該 pattern 的所有版本歷史
    await this.deleteVersionsByPatternId(id);
    return this.delete(db, STORE_PATTERNS, id);
  }

  async getAllPatterns(): Promise<StoredPattern[]> {
    const db = this.getDB();
    return this.getAll<StoredPattern>(db, STORE_PATTERNS);
  }

  // ──── 版本歷史操作 ────

  async saveVersion(patternId: string, pattern: Pattern, label?: string): Promise<string> {
    const db = this.getDB();
    const versionId = `ver_${patternId}_${Date.now()}`;
    const record: PatternVersion = {
      versionId,
      patternId,
      pattern: { ...pattern },
      savedAt: new Date().toISOString(),
      label
    };
    await this.put(db, STORE_VERSIONS, record);
    return versionId;
  }

  async getVersionsByPatternId(patternId: string): Promise<PatternVersion[]> {
    const db = this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VERSIONS, 'readonly');
      const store = tx.objectStore(STORE_VERSIONS);
      const index = store.index('patternId');
      const request = index.getAll(patternId);

      request.onsuccess = () => {
        const versions = (request.result as PatternVersion[]).sort(
          (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        );
        resolve(versions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getVersion(versionId: string): Promise<PatternVersion | null> {
    const db = this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VERSIONS, 'readonly');
      const store = tx.objectStore(STORE_VERSIONS);
      const request = store.get(versionId);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteVersion(versionId: string): Promise<void> {
    const db = this.getDB();
    return this.delete(db, STORE_VERSIONS, versionId);
  }

  private async deleteVersionsByPatternId(patternId: string): Promise<void> {
    const versions = await this.getVersionsByPatternId(patternId);
    const db = this.getDB();
    const tx = db.transaction(STORE_VERSIONS, 'readwrite');
    const store = tx.objectStore(STORE_VERSIONS);

    for (const v of versions) {
      store.delete(v.versionId);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ──── Meta 操作（儲存 currentProfileId, currentPatternId 等） ────

  async setMeta(key: string, value: unknown): Promise<void> {
    const db = this.getDB();
    return this.put(db, STORE_META, { key, value });
  }

  async getMeta<T = unknown>(key: string): Promise<T | null> {
    const db = this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? (result.value as T) : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ──── 統計 ────

  async getStats(): Promise<StorageStats> {
    const db = this.getDB();
    const [profileCount, patternCount, versionCount] = await Promise.all([
      this.count(db, STORE_PROFILES),
      this.count(db, STORE_PATTERNS),
      this.count(db, STORE_VERSIONS)
    ]);
    return { profileCount, patternCount, versionCount };
  }

  // ──── 清除所有資料 ────

  async clearAll(): Promise<void> {
    const db = this.getDB();
    const storeNames = [STORE_PROFILES, STORE_PATTERNS, STORE_VERSIONS, STORE_META];
    const tx = db.transaction(storeNames, 'readwrite');

    for (const name of storeNames) {
      tx.objectStore(name).clear();
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log('StorageManager: 所有資料已清除');
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  // ──── 銷毀 ────

  dispose(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
    console.log('StorageManager: 已銷毀');
  }

  // ──── 通用 IndexedDB 輔助方法 ────

  private put<T>(db: IDBDatabase, storeName: string, record: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private delete(db: IDBDatabase, storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private getAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  private count(db: IDBDatabase, storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
