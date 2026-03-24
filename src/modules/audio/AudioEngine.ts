// 音頻引擎 - 處理所有音頻播放、錄製和音量計算

import { Buzzer, Pattern, PlaybackState, AudioEvent } from '../../types';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private currentOscillator: OscillatorNode | null = null;
  private currentGainNode: GainNode | null = null;
  private playbackTimeout: number | null = null;
  private playbackState: PlaybackState = {
    isPlaying: false,
    currentStep: -1,
    totalSteps: 0
  };

  // 事件監聽器
  private eventListeners: Map<string, ((event: AudioEvent) => void)[]> = new Map();

  // 主音量控制
  private masterVolume: number = 0.3;

  constructor() {
    // 延遲初始化AudioContext，避免在頁面載入時立即創建
    // AudioContext 將在首次使用時創建
  }

  /**
   * 初始化音頻上下文
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioEngine: 音頻上下文初始化成功');
    } catch (error) {
      console.error('AudioEngine: 音頻上下文初始化失敗', error);
    }
  }

  /**
   * 確保音頻上下文已啟動
   */
  private async ensureAudioContextStarted(): Promise<boolean> {
    if (!this.audioContext) {
      await this.initializeAudioContext();
    }

    if (!this.audioContext) {
      return false;
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('AudioEngine: 音頻上下文恢復成功');
      } catch (error) {
        console.error('AudioEngine: 音頻上下文恢復失敗', error);
        return false;
      }
    }

    return this.audioContext.state === 'running';
  }

  /**
   * 根據SPL值計算音量
   */
  calculateVolume(frequency: number, buzzerProfile: Buzzer): number {
    const freqIndex = buzzerProfile.frequencies.indexOf(frequency);

    if (freqIndex === -1) {
      console.log(`AudioEngine: 頻率 ${frequency}Hz 不在 buzzer profile 中，使用默認音量 0.1`);
      return 0.1 * this.masterVolume;
    }

    const spl = buzzerProfile.spl_values[freqIndex];
    const maxSPL = Math.max(...buzzerProfile.spl_values);

    // dB SPL → 電壓轉換公式（音量對應）
    const volume = Math.pow(10, (spl - maxSPL) / 20);

    // 安全邊界限制
    const normalizedVolume = Math.min(Math.max(volume, 0.01), 1.0);

    // 應用主音量控制
    const finalVolume = normalizedVolume * this.masterVolume;

    console.log(`AudioEngine: ${frequency}Hz SPL=${spl}dB → 標準音量=${normalizedVolume.toFixed(3)} → 最終音量=${finalVolume.toFixed(3)}`);

    return finalVolume;
  }

  /**
   * 播放單個音符
   */
  async playNote(note: any, buzzerProfile: Buzzer): Promise<void> {
    if (!note || !buzzerProfile) return;

    try {
      await this.playTone(note.frequency, note.duration || 500, buzzerProfile);
    } catch (error) {
      console.error('AudioEngine: 播放音符失敗', error);
      this.emitEvent({ type: 'stop' });
    }
  }

  /**
   * 播放單個音調
   */
  async playTone(frequency: number, duration: number, buzzerProfile: Buzzer): Promise<void> {
    const isReady = await this.ensureAudioContextStarted();
    if (!isReady || !this.audioContext) {
      throw new Error('AudioEngine: 音頻上下文不可用');
    }

    // 停止之前的音符
    this.stopCurrentTone();

    if (frequency === 0) {
      // 靜音
      return new Promise<void>(resolve => {
        this.playbackTimeout = window.setTimeout(() => {
          this.emitEvent({
            type: 'step',
            frequency: 0,
            duration
          });
          resolve();
        }, duration);
      });
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

      const volume = this.calculateVolume(frequency, buzzerProfile);
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      this.currentOscillator = oscillator;
      this.currentGainNode = gainNode;

      oscillator.start(this.audioContext.currentTime);

      this.emitEvent({
        type: 'step',
        frequency,
        duration
      });

      return new Promise<void>(resolve => {
        this.playbackTimeout = window.setTimeout(() => {
          this.stopCurrentTone();
          resolve();
        }, duration);
      });

    } catch (error) {
      console.error('AudioEngine: 播放音調失敗', error);
      throw error;
    }
  }

  /**
   * 停止當前音調
   */
  private stopCurrentTone(): void {
    if (this.currentOscillator) {
      try {
        this.currentOscillator.stop();
      } catch (e) {
        // 忽略已經停止的錯誤
      }
      this.currentOscillator = null;
    }

    if (this.currentGainNode) {
      this.currentGainNode = null;
    }

    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
      this.playbackTimeout = null;
    }
  }

  /**
   * 播放完整pattern
   */
  async playPattern(pattern: Pattern, buzzerProfile: Buzzer): Promise<void> {
    if (this.playbackState.isPlaying) {
      throw new Error('AudioEngine: 已在播放中');
    }

    this.playbackState = {
      isPlaying: true,
      currentStep: 0,
      totalSteps: pattern.pattern.length,
      patternId: pattern.id
    };

    this.emitEvent({
      type: 'play',
      patternId: pattern.id
    });

    try {
      for (let i = 0; i < pattern.pattern.length; i++) {
        if (!this.playbackState.isPlaying) {
          console.log('AudioEngine: 播放被中斷');
          break;
        }

        this.playbackState.currentStep = i;
        const [frequency, duration] = pattern.pattern[i];

        console.log(`AudioEngine: 播放步驟 ${i + 1}: ${frequency}Hz for ${duration}ms`);
        await this.playTone(frequency, duration, buzzerProfile);
      }
    } catch (error) {
      console.error('AudioEngine: Pattern播放失敗', error);
      throw error;
    } finally {
      this.stopPlayback();
    }
  }

  /**
   * 停止播放
   */
  stopPlayback(): void {
    console.log('AudioEngine: 停止播放');

    this.playbackState.isPlaying = false;
    this.stopCurrentTone();

    this.emitEvent({
      type: 'stop',
      patternId: this.playbackState.patternId
    });

    this.playbackState = {
      isPlaying: false,
      currentStep: -1,
      totalSteps: 0
    };
  }

  /**
   * 暫停播放（暫時不實現，保留接口）
   */
  pausePlayback(): void {
    // TODO: 實現暫停功能
    console.log('AudioEngine: 暫停功能待實現');
  }

  /**
   * 錄製pattern為音頻
   */
  async recordPatternToBlob(pattern: Pattern, buzzerProfile: Buzzer): Promise<Blob> {
    if (!this.audioContext) {
      throw new Error('AudioEngine: 音頻上下文不可用');
    }

    const totalDuration = pattern.pattern.reduce((sum, [, duration]) => sum + duration, 0);
    const sampleRate = 44100;
    const offlineContext = new OfflineAudioContext(1, Math.ceil(totalDuration * sampleRate / 1000), sampleRate);

    let currentTime = 0;

    for (const [frequency, duration] of pattern.pattern) {
      if (frequency > 0) {
        const oscillator = offlineContext.createOscillator();
        const gainNode = offlineContext.createGain();

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, currentTime / 1000);

        const volume = this.calculateVolume(frequency, buzzerProfile);
        gainNode.gain.setValueAtTime(volume, currentTime / 1000);
        gainNode.gain.setValueAtTime(0, (currentTime + duration) / 1000);

        oscillator.connect(gainNode);
        gainNode.connect(offlineContext.destination);

        oscillator.start(currentTime / 1000);
        oscillator.stop((currentTime + duration) / 1000);
      }

      currentTime += duration;
    }

    const audioBuffer = await offlineContext.startRendering();
    return this.audioBufferToWav(audioBuffer);
  }

  /**
   * 將AudioBuffer轉換為WAV格式的Blob
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // 寫入音頻數據
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * 設置主音量
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0.01, Math.min(1.0, volume));
    console.log(`AudioEngine: 主音量設置為 ${(this.masterVolume * 100).toFixed(0)}%`);
  }

  /**
   * 獲取主音量
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * 獲取播放狀態
   */
  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  /**
   * 事件監聽
   */
  addEventListener(eventType: string, callback: (event: AudioEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * 移除事件監聽
   */
  removeEventListener(eventType: string, callback: (event: AudioEvent) => void): void {
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
  private emitEvent(event: AudioEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  /**
   * 銷毀音頻引擎
   */
  dispose(): void {
    this.stopPlayback();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.eventListeners.clear();
    console.log('AudioEngine: 已銷毀');
  }
}