// 音樂理論工具類 - 處理音符、頻率、調性相關計算

import { Note, MusicalKey } from '../../types';

export class MusicTheory {
  // 標準音符名稱（半音階）
  private static readonly NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // A4 = 440Hz 作為基準
  private static readonly A4_FREQUENCY = 440;
  private static readonly A4_NOTE_NUMBER = 69; // MIDI note number for A4

  /**
   * 將頻率轉換為音符資訊
   */
  static frequencyToNote(frequency: number, duration: number = 500): Note {
    if (frequency <= 0) {
      return { name: '靜音', octave: 0, frequency: 0, duration };
    }

    // 計算 MIDI note number
    const midiNote = Math.round(12 * Math.log2(frequency / this.A4_FREQUENCY) + this.A4_NOTE_NUMBER);

    // 計算八度和音符
    const octave = Math.floor(midiNote / 12) - 1;
    const noteIndex = midiNote % 12;
    const noteName = this.NOTE_NAMES[noteIndex];

    return {
      name: noteName,
      octave: Math.max(0, octave),
      frequency: frequency,
      duration
    };
  }

  /**
   * 將音符轉換為頻率
   */
  static noteToFrequency(noteName: string, octave: number): number {
    if (noteName === '靜音') return 0;

    const noteIndex = this.NOTE_NAMES.indexOf(noteName);
    if (noteIndex === -1) {
      throw new Error(`未知音符: ${noteName}`);
    }

    // 計算 MIDI note number
    const midiNote = (octave + 1) * 12 + noteIndex;

    // 使用等音律公式計算頻率
    const frequency = this.A4_FREQUENCY * Math.pow(2, (midiNote - this.A4_NOTE_NUMBER) / 12);

    return Math.round(frequency * 100) / 100; // 保留兩位小數
  }

  /**
   * 調整音符的八度
   */
  static adjustOctave(note: Note, octaveChange: number): Note {
    if (note.frequency === 0) return note;

    const newOctave = Math.max(0, Math.min(8, note.octave + octaveChange));
    const newFrequency = this.noteToFrequency(note.name, newOctave);

    return {
      ...note,
      octave: newOctave,
      frequency: newFrequency
    };
  }

  /**
   * 調整頻率的八度
   */
  static adjustFrequencyOctave(frequency: number, octaveChange: number): number {
    if (frequency === 0) return 0;

    const note = this.frequencyToNote(frequency);
    const adjustedNote = this.adjustOctave(note, octaveChange);
    return adjustedNote.frequency;
  }

  /**
   * 獲取調性的音符
   */
  static getKeyNotes(key: MusicalKey): string[] {
    const tonicIndex = this.NOTE_NAMES.indexOf(key.tonic);
    if (tonicIndex === -1) {
      throw new Error(`未知主音: ${key.tonic}`);
    }

    let intervals: number[];

    switch (key.mode) {
      case 'major':
        intervals = [0, 2, 4, 5, 7, 9, 11]; // 大調音程
        break;
      case 'minor':
        intervals = [0, 2, 3, 5, 7, 8, 10]; // 自然小調音程
        break;
      case 'dorian':
        intervals = [0, 2, 3, 5, 7, 9, 10]; // 多利安調式
        break;
      case 'mixolydian':
        intervals = [0, 2, 4, 5, 7, 9, 10]; // 混音利底安調式
        break;
      case 'custom':
        return key.notes; // 自定義調性
      default:
        intervals = [0, 2, 4, 5, 7, 9, 11]; // 預設大調
    }

    return intervals.map(interval =>
      this.NOTE_NAMES[(tonicIndex + interval) % 12]
    );
  }

  /**
   * 檢查音符是否在指定調性中
   */
  static isNoteInKey(noteName: string, key: MusicalKey): boolean {
    const keyNotes = this.getKeyNotes(key);
    return keyNotes.includes(noteName);
  }

  /**
   * 生成音符表格（棋盤用）
   */
  static generateNoteGrid(octaveRange: [number, number] = [1, 7]): Note[][] {
    const [minOctave, maxOctave] = octaveRange;
    const grid: Note[][] = [];

    // 按八度組織音符（從高到低）
    for (let octave = maxOctave; octave >= minOctave; octave--) {
      const octaveNotes: Note[] = [];

      // 按半音階順序
      for (const noteName of this.NOTE_NAMES) {
        const frequency = this.noteToFrequency(noteName, octave);
        octaveNotes.push({
          name: noteName,
          octave,
          frequency,
          duration: 500 // Default duration
        });
      }

      grid.push(octaveNotes);
    }

    return grid;
  }

  /**
   * 獲取音符的顯示名稱（包含八度）
   */
  static getNoteDisplayName(note: Note): string {
    if (note.frequency === 0) return '靜音';
    return `${note.name}${note.octave}`;
  }

  /**
   * 計算兩個頻率之間的音程（半音數）
   */
  static getInterval(freq1: number, freq2: number): number {
    if (freq1 === 0 || freq2 === 0) return 0;
    return Math.round(12 * Math.log2(freq2 / freq1));
  }

  /**
   * 獲取預定義的常用調性
   */
  static getCommonKeys(): MusicalKey[] {
    const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
    const minorKeys = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'D', 'G', 'C', 'F', 'Bb'];

    const keys: MusicalKey[] = [];

    // 大調
    majorKeys.forEach(tonic => {
      keys.push({
        tonic,
        mode: 'major',
        notes: this.getKeyNotes({ tonic, mode: 'major', notes: [] })
      });
    });

    // 小調
    minorKeys.forEach(tonic => {
      keys.push({
        tonic,
        mode: 'minor',
        notes: this.getKeyNotes({ tonic, mode: 'minor', notes: [] })
      });
    });

    return keys;
  }

  /**
   * 驗證頻率是否在可聽範圍內
   */
  static isAudibleFrequency(frequency: number): boolean {
    return frequency >= 20 && frequency <= 20000;
  }

  /**
   * 獲取最接近的標準音符頻率
   */
  static getClosestNoteFrequency(targetFrequency: number): number {
    if (targetFrequency === 0) return 0;

    const note = this.frequencyToNote(targetFrequency);
    return this.noteToFrequency(note.name, note.octave);
  }
}