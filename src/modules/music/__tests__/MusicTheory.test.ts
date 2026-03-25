import { describe, it, expect } from 'vitest';
import { MusicTheory } from '../MusicTheory';

describe('MusicTheory', () => {
  describe('noteToFrequency', () => {
    it('should return 440Hz for A4', () => {
      const freq = MusicTheory.noteToFrequency('A', 4);
      expect(freq).toBeCloseTo(440, 1);
    });

    it('should return 261.63Hz for C4 (middle C)', () => {
      const freq = MusicTheory.noteToFrequency('C', 4);
      expect(freq).toBeCloseTo(261.63, 0);
    });

    it('should double frequency for each octave up', () => {
      const freqA4 = MusicTheory.noteToFrequency('A', 4);
      const freqA5 = MusicTheory.noteToFrequency('A', 5);
      expect(freqA5).toBeCloseTo(freqA4 * 2, 1);
    });

    it('should halve frequency for each octave down', () => {
      const freqA4 = MusicTheory.noteToFrequency('A', 4);
      const freqA3 = MusicTheory.noteToFrequency('A', 3);
      expect(freqA3).toBeCloseTo(freqA4 / 2, 1);
    });
  });

  describe('frequencyToNote', () => {
    it('should return A4 for 440Hz', () => {
      const note = MusicTheory.frequencyToNote(440);
      expect(note.name).toBe('A');
      expect(note.octave).toBe(4);
    });

    it('should return closest note for non-exact frequencies', () => {
      const note = MusicTheory.frequencyToNote(442);
      expect(note.name).toBe('A');
      expect(note.octave).toBe(4);
    });
  });

  describe('getKeyNotes', () => {
    it('should return 7 notes for C major', () => {
      const notes = MusicTheory.getKeyNotes({ tonic: 'C', mode: 'major', notes: [] });
      expect(notes).toHaveLength(7);
      expect(notes[0]).toBe('C');
    });

    it('should return 7 notes for A minor', () => {
      const notes = MusicTheory.getKeyNotes({ tonic: 'A', mode: 'minor', notes: [] });
      expect(notes).toHaveLength(7);
      expect(notes[0]).toBe('A');
    });
  });
});
