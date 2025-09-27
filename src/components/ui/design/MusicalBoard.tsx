// Musical Board 音樂棋盤組件 - 重構版本

import React, { useState, useEffect, useMemo } from 'react';
import { Buzzer, Note } from '../../../types';
import { MusicTheory } from '../../../modules/music/MusicTheory';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';
// import { NoteFilters, FilterOptions, FrequencyRange } from './board/NoteFilters'; // 暫時移除但保留程式碼
import { BoardGrid } from './board/BoardGrid';
import { SelectedNotesDisplay } from './board/SelectedNotesDisplay';

export interface MusicalBoardProps {
  className?: string;
  onNoteSelect?: (note: Note) => void;
  selectedNotes?: Note[];
  disabled?: boolean;
}

export const MusicalBoard: React.FC<MusicalBoardProps> = ({
  className = '',
  onNoteSelect,
  selectedNotes = [],
  disabled = false
}) => {
  const { currentProfile, appCore } = useBuzzerApp();

  // 過濾器狀態 - 暫時移除但保留程式碼
  /*
  const [filters, setFilters] = useState<FilterOptions>({
    octaveRange: [2, 6],
    volumeThreshold: 50,
    showOnlyHighVolume: false,
    highlightBestFrequencies: true
  });

  // 頻率範圍狀態
  const [frequencyRange, setFrequencyRange] = useState<FrequencyRange>({
    min: 80,
    max: 2000
  });

  // 從profile更新頻率範圍
  useEffect(() => {
    if (currentProfile && appCore) {
      const stats = appCore.profileManager.getProfileStats(
        appCore.profileManager.getCurrentProfileId() || ''
      );
      if (stats) {
        setFrequencyRange({
          min: Math.max(stats.frequencyRange[0] - 50, 20),
          max: Math.min(stats.frequencyRange[1] + 50, 4000)
        });
      }
    }
  }, [currentProfile, appCore]);
  */

  // 生成可用音符 - 簡化版本（移除過濾器邏輯）
  const availableNotes = useMemo(() => {
    if (!currentProfile || !appCore) return [];

    const notes: Note[] = [];
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // 使用固定的八度範圍（2-6）
    for (let octave = 2; octave <= 6; octave++) {
      for (const noteName of noteNames) {
        const frequency = MusicTheory.noteToFrequency(noteName, octave);

        // 使用基本的頻率範圍過濾（80-2000 Hz）
        if (frequency >= 80 && frequency <= 2000) {
          // 計算SPL值
          const spl = appCore.audioEngine.calculateVolume(frequency, currentProfile) || 0;

          notes.push({
            name: noteName,
            octave,
            frequency,
            spl,
            duration: 500, // 默認時長
            volume: spl // 使用SPL作為初始音量
          });
        }
      }
    }

    return notes;
  }, [currentProfile, appCore]);

  // 獲取最佳音符（SPL值最高的前20%）
  const bestNotes = useMemo(() => {
    const sortedBySPL = [...availableNotes].sort((a, b) => (b.spl || 0) - (a.spl || 0));
    const topCount = Math.ceil(sortedBySPL.length * 0.2);
    return new Set(sortedBySPL.slice(0, topCount).map(note => `${note.name}${note.octave}`));
  }, [availableNotes]);

  // 處理音符點擊
  const handleNoteClick = React.useCallback((note: Note) => {
    if (disabled) return;
    onNoteSelect?.(note);

    // 播放音符預覽
    if (appCore && currentProfile) {
      appCore.audioEngine.playNote(note, currentProfile);
    }
  }, [disabled, onNoteSelect, appCore, currentProfile]);

  // 處理音符預覽播放
  const handlePlayPreview = React.useCallback(async (note: Note) => {
    if (!appCore || !currentProfile) return;

    try {
      await appCore.audioEngine.playNote(note, currentProfile);
    } catch (error) {
      console.error('播放音符預覽失敗:', error);
    }
  }, [appCore, currentProfile]);

  // 處理移除選中的音符
  const handleRemoveSelectedNote = React.useCallback((index: number) => {
    // 這個功能需要父組件提供回調
    console.log('Remove note at index:', index);
  }, []);

  // 處理清空所有選中音符
  const handleClearAllSelected = React.useCallback(() => {
    // 這個功能需要父組件提供回調
    console.log('Clear all selected notes');
  }, []);

  if (!currentProfile) {
    return (
      <div className={`bg-gray-50 rounded-xl p-8 text-center ${className}`}>
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">請先選擇Buzzer Profile</h3>
        <p className="text-gray-500">選擇Profile後即可查看音樂棋盤</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 過濾器控制區 - 暫時移除但保留程式碼 */}
      {/*
      <NoteFilters
        filters={filters}
        onFiltersChange={setFilters}
        frequencyRange={frequencyRange}
        availableNotesCount={availableNotes.length}
        selectedNotesCount={selectedNotes.length}
      />
      */}

      {/* 音樂棋盤 */}
      <BoardGrid
        notes={availableNotes}
        selectedNotes={selectedNotes}
        bestNotes={bestNotes}
        onNoteClick={handleNoteClick}
        disabled={disabled}
        highlightBest={true} // 固定啟用最佳音符高亮
      />

      {/* 選中音符顯示 */}
      <SelectedNotesDisplay
        selectedNotes={selectedNotes}
        onRemoveNote={handleRemoveSelectedNote}
        onClearAll={handleClearAllSelected}
        onPlayPreview={handlePlayPreview}
        readOnly={disabled}
      />
    </div>
  );
};