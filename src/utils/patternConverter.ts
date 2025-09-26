// 數據轉換工具 - 在backend pattern數組和UI notes數組之間轉換

import { Pattern, Note } from '../types';
import { MusicTheory } from '../modules/music/MusicTheory';

/**
 * 將backend的pattern數組轉換為UI的notes數組
 */
export function patternToNotes(pattern: [number, number][]): Note[] {
  return pattern.map(([frequency, duration]) => {
    if (frequency === 0) {
      // 靜音音符
      return {
        name: 'Rest',
        octave: 0,
        frequency: 0,
        duration
      };
    }

    // 從頻率計算音符
    const noteInfo = MusicTheory.frequencyToNote(frequency);
    return {
      name: noteInfo.name,
      octave: noteInfo.octave,
      frequency,
      duration
    };
  });
}

/**
 * 將UI的notes數組轉換為backend的pattern數組
 */
export function notesToPattern(notes: Note[]): [number, number][] {
  return notes.map(note => [note.frequency, note.duration]);
}

/**
 * 確保Pattern對象同時包含pattern和notes數組
 */
export function ensurePatternSync(pattern: Partial<Pattern>): Pattern {
  const result: Pattern = {
    id: pattern.id || '',
    name: pattern.name || '',
    pattern: pattern.pattern || [],
    notes: pattern.notes || [],
    tempo: pattern.tempo || 120,
    createdAt: pattern.createdAt,
    modifiedAt: pattern.modifiedAt
  };

  // 如果只有pattern沒有notes，轉換pattern到notes
  if (result.pattern.length > 0 && result.notes.length === 0) {
    result.notes = patternToNotes(result.pattern);
  }

  // 如果只有notes沒有pattern，轉換notes到pattern
  else if (result.notes.length > 0 && result.pattern.length === 0) {
    result.pattern = notesToPattern(result.notes);
  }

  // 如果兩個都有，檢查是否同步
  else if (result.pattern.length > 0 && result.notes.length > 0) {
    // 比較數組長度，如果不同則以notes為準
    if (result.pattern.length !== result.notes.length) {
      result.pattern = notesToPattern(result.notes);
    }
  }

  return result;
}

/**
 * 創建一個空的Pattern對象
 */
export function createEmptyPattern(name: string = 'New Pattern'): Pattern {
  return {
    id: `pattern-${Date.now()}`,
    name,
    pattern: [],
    notes: [],
    tempo: 120,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  };
}