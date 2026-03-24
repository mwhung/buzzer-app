// Musical Board 音樂棋盤組件

import { useState, useEffect, useMemo, memo } from 'react';
import { Note } from '../../../types';
import { MusicTheory } from '../../../modules/music/MusicTheory';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';

export interface MusicalBoardProps {
  className?: string;
  onNoteSelect?: (note: Note) => void;
  selectedNotes?: Note[];
  disabled?: boolean;
}

interface FrequencyRange {
  min: number;
  max: number;
}

interface FilterOptions {
  octaveRange: [number, number];
  volumeThreshold: number;
  showOnlyHighVolume: boolean;
  highlightBestFrequencies: boolean;
}

export const MusicalBoard: React.FC<MusicalBoardProps> = memo(({
  className = '',
  onNoteSelect,
  selectedNotes = [],
  disabled = false
}) => {
  const { currentProfile, appCore } = useBuzzerApp();

  // 過濾器狀態
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

  // 生成可用音符
  const availableNotes = useMemo(() => {
    if (!currentProfile) return [];

    const notes: Note[] = [];
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // 遍歷八度範圍
    for (let octave = filters.octaveRange[0]; octave <= filters.octaveRange[1]; octave++) {
      for (const noteName of noteNames) {
        const frequency = MusicTheory.noteToFrequency(noteName, octave);

        // 檢查頻率是否在範圍內
        if (frequency >= frequencyRange.min && frequency <= frequencyRange.max) {
          // 計算音量
          const volume = appCore?.audioEngine.calculateVolume(frequency, currentProfile) || 0;

          // 應用音量過濾器
          if (filters.showOnlyHighVolume && volume < filters.volumeThreshold) {
            continue;
          }

          notes.push({
            name: noteName,
            octave,
            frequency,
            volume,
            duration: 500 // 默認時長
          });
        }
      }
    }

    return notes;
  }, [currentProfile, filters, frequencyRange, appCore]);

  // 獲取最佳音符（音量最高的前20%）
  const bestNotes = useMemo(() => {
    const sortedByVolume = [...availableNotes].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    const topCount = Math.ceil(sortedByVolume.length * 0.2);
    return new Set(sortedByVolume.slice(0, topCount).map(note => `${note.name}${note.octave}`));
  }, [availableNotes]);

  // O(1) 音符選擇查找
  const selectedNoteKeys = useMemo(
    () => new Set(selectedNotes.map(n => `${n.name}${n.octave}`)),
    [selectedNotes]
  );

  // 處理音符點擊
  const handleNoteClick = (note: Note) => {
    if (disabled) return;
    onNoteSelect?.(note);

    // 播放音符預覽
    if (appCore && currentProfile) {
      appCore.audioEngine.playNote(note, currentProfile);
    }
  };

  // 檢查音符是否被選中 (O(1))
  const isNoteSelected = (note: Note) => {
    return selectedNoteKeys.has(`${note.name}${note.octave}`);
  };

  // 獲取音符顏色類
  const getNoteColorClass = (note: Note) => {
    const isSelected = isNoteSelected(note);
    const isBest = filters.highlightBestFrequencies &&
                   bestNotes.has(`${note.name}${note.octave}`);

    if (isSelected) {
      return 'bg-blue-600 text-white border-blue-700';
    }

    if (isBest) {
      return 'bg-green-100 text-green-900 border-green-300 hover:bg-green-200';
    }

    return `bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900`;
  };

  // 獲取音符尺寸類（根據音量）
  const getNoteSizeClass = (note: Note) => {
    const vol = note.volume ?? 0;
    if (vol > 70) return 'w-12 h-12 text-sm';
    if (vol > 50) return 'w-10 h-10 text-xs';
    return 'w-8 h-8 text-xs';
  };

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
      {/* 過濾器控制區 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">音符過濾器</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 八度範圍 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              八度範圍: {filters.octaveRange[0]} - {filters.octaveRange[1]}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="8"
                value={filters.octaveRange[0]}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  octaveRange: [parseInt(e.target.value), prev.octaveRange[1]]
                }))}
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max="8"
                value={filters.octaveRange[1]}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  octaveRange: [prev.octaveRange[0], parseInt(e.target.value)]
                }))}
                className="w-full"
              />
            </div>
          </div>

          {/* 音量閾值 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              音量閾值: {filters.volumeThreshold}dB
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.volumeThreshold}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                volumeThreshold: parseInt(e.target.value)
              }))}
              className="w-full"
            />
          </div>

          {/* 切換選項 */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.showOnlyHighVolume}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  showOnlyHighVolume: e.target.checked
                }))}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">僅顯示高音量音符</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.highlightBestFrequencies}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  highlightBestFrequencies: e.target.checked
                }))}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">突出顯示最佳頻率</span>
            </label>
          </div>

          {/* 統計信息 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">
              <div>可用音符: {availableNotes.length}</div>
              <div>已選音符: {selectedNotes.length}</div>
              <div>頻率範圍: {frequencyRange.min}-{frequencyRange.max}Hz</div>
            </div>
          </div>
        </div>
      </div>

      {/* 音樂棋盤 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          音樂棋盤
          {filters.highlightBestFrequencies && (
            <span className="ml-2 text-sm font-normal text-green-600">
              (綠色: 最佳音符)
            </span>
          )}
        </h3>

        {availableNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            沒有符合條件的音符，請調整過濾器設置
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-2">
            {availableNotes.map((note) => (
              <button
                key={`${note.name}${note.octave}`}
                onClick={() => handleNoteClick(note)}
                disabled={disabled}
                className={`
                  ${getNoteSizeClass(note)}
                  ${getNoteColorClass(note)}
                  border rounded-lg flex items-center justify-center
                  transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  font-medium
                `}
                title={`${note.name}${note.octave} (${note.frequency.toFixed(1)}Hz, ${(note.volume ?? 0).toFixed(1)}dB)`}
              >
                <div className="text-center">
                  <div className="leading-none">{note.name}</div>
                  <div className="text-xs opacity-75">{note.octave}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 選中音符顯示 */}
      {selectedNotes.length > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h4 className="text-md font-semibold text-blue-900 mb-3">已選音符 ({selectedNotes.length})</h4>
          <div className="flex flex-wrap gap-2">
            {selectedNotes.map((note, index) => (
              <div
                key={`selected-${note.name}${note.octave}-${index}`}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
              >
                {note.name}{note.octave}
                <span className="ml-1 opacity-75">
                  ({note.frequency.toFixed(0)}Hz)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});