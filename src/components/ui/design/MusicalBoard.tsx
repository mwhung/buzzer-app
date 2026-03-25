// Musical Board 音樂棋盤組件

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Note } from '../../../types';
import { MusicTheory } from '../../../modules/music/MusicTheory';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';
import { Button } from '../common/Button';

export interface MusicalBoardProps {
  className?: string;
  onNoteSelect?: (note: Note) => void;
  onNoteRemove?: (index: number) => void;
  onNotesClear?: () => void;
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

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_KEYS = new Set(['C#', 'D#', 'F#', 'G#', 'A#']);

export const MusicalBoard: React.FC<MusicalBoardProps> = memo(({
  className = '',
  onNoteSelect,
  onNoteRemove,
  onNotesClear,
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

  // 過濾器面板展開狀態
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

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

  // 重置過濾器
  const resetFilters = useCallback(() => {
    setFilters({
      octaveRange: [2, 6],
      volumeThreshold: 50,
      showOnlyHighVolume: false,
      highlightBestFrequencies: true
    });
  }, []);

  // 按八度分組的可用音符
  const notesByOctave = useMemo(() => {
    if (!currentProfile) return new Map<number, Note[]>();

    const grouped = new Map<number, Note[]>();

    for (let octave = filters.octaveRange[0]; octave <= filters.octaveRange[1]; octave++) {
      const octaveNotes: Note[] = [];
      for (const noteName of NOTE_NAMES) {
        const frequency = MusicTheory.noteToFrequency(noteName, octave);

        if (frequency >= frequencyRange.min && frequency <= frequencyRange.max) {
          const volume = appCore?.audioEngine.calculateVolume(frequency, currentProfile) || 0;

          if (filters.showOnlyHighVolume && volume < filters.volumeThreshold) {
            continue;
          }

          octaveNotes.push({
            name: noteName,
            octave,
            frequency,
            volume,
            duration: 500
          });
        }
      }
      if (octaveNotes.length > 0) {
        grouped.set(octave, octaveNotes);
      }
    }

    return grouped;
  }, [currentProfile, filters, frequencyRange, appCore]);

  // 所有可用音符展平列表
  const allNotes = useMemo(() => {
    const notes: Note[] = [];
    notesByOctave.forEach(octaveNotes => notes.push(...octaveNotes));
    return notes;
  }, [notesByOctave]);

  // 獲取最佳音符
  const bestNotes = useMemo(() => {
    const sortedByVolume = [...allNotes].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    const topCount = Math.ceil(sortedByVolume.length * 0.2);
    return new Set(sortedByVolume.slice(0, topCount).map(note => `${note.name}${note.octave}`));
  }, [allNotes]);

  // O(1) 音符選擇查找
  const selectedNoteKeys = useMemo(
    () => new Set(selectedNotes.map(n => `${n.name}${n.octave}`)),
    [selectedNotes]
  );

  // 處理音符點擊
  const handleNoteClick = useCallback((note: Note) => {
    if (disabled) return;
    onNoteSelect?.(note);

    if (appCore && currentProfile) {
      appCore.audioEngine.playNote(note, currentProfile);
    }
  }, [disabled, onNoteSelect, appCore, currentProfile]);

  // 八度範圍驗證
  const handleOctaveMinChange = useCallback((value: number) => {
    setFilters(prev => ({
      ...prev,
      octaveRange: [Math.min(value, prev.octaveRange[1]), prev.octaveRange[1]]
    }));
  }, []);

  const handleOctaveMaxChange = useCallback((value: number) => {
    setFilters(prev => ({
      ...prev,
      octaveRange: [prev.octaveRange[0], Math.max(value, prev.octaveRange[0])]
    }));
  }, []);

  // 獲取音符樣式
  const getNoteStyle = useCallback((note: Note) => {
    const isSelected = selectedNoteKeys.has(`${note.name}${note.octave}`);
    const isBest = filters.highlightBestFrequencies && bestNotes.has(`${note.name}${note.octave}`);
    const isBlack = BLACK_KEYS.has(note.name);

    if (isSelected) {
      return 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400 ring-offset-1';
    }
    if (isBest) {
      return isBlack
        ? 'bg-green-700 text-green-100 border-green-800 hover:bg-green-600'
        : 'bg-green-100 text-green-900 border-green-300 hover:bg-green-200';
    }
    return isBlack
      ? 'bg-gray-700 text-gray-100 border-gray-800 hover:bg-gray-600'
      : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100';
  }, [selectedNoteKeys, filters.highlightBestFrequencies, bestNotes]);

  // 音量指示條高度
  const getVolumeBarHeight = useCallback((note: Note) => {
    const vol = note.volume ?? 0;
    return Math.max(Math.min((vol / 100) * 100, 100), 5);
  }, []);

  if (!currentProfile) {
    return (
      <div className={`bg-gray-50 rounded-xl p-8 text-center ${className}`}>
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">請先選擇 Buzzer Profile</h3>
        <p className="text-gray-600 mb-4">選擇 Profile 後即可使用音樂棋盤選取音符</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 過濾器（可收合） */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 rounded-xl transition-colors"
          aria-expanded={isFilterExpanded}
        >
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">音符過濾器</h3>
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
              {allNotes.length} 個可用音符
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isFilterExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isFilterExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 八度範圍 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  八度範圍: {filters.octaveRange[0]} - {filters.octaveRange[1]}
                </label>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-6">低</span>
                    <input
                      type="range" min="0" max="8"
                      value={filters.octaveRange[0]}
                      onChange={(e) => handleOctaveMinChange(parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      aria-label="最低八度"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-6">高</span>
                    <input
                      type="range" min="0" max="8"
                      value={filters.octaveRange[1]}
                      onChange={(e) => handleOctaveMaxChange(parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      aria-label="最高八度"
                    />
                  </div>
                </div>
              </div>

              {/* 音量閾值 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  音量閾值: {filters.volumeThreshold}dB
                </label>
                <input
                  type="range" min="0" max="100"
                  value={filters.volumeThreshold}
                  onChange={(e) => setFilters(prev => ({ ...prev, volumeThreshold: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  aria-label="音量閾值"
                />
              </div>

              {/* 切換選項 */}
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showOnlyHighVolume}
                    onChange={(e) => setFilters(prev => ({ ...prev, showOnlyHighVolume: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="ml-2 text-xs text-gray-700">僅高音量音符</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.highlightBestFrequencies}
                    onChange={(e) => setFilters(prev => ({ ...prev, highlightBestFrequencies: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="ml-2 text-xs text-gray-700">突出最佳頻率</span>
                </label>
              </div>

              {/* 重置按鈕 */}
              <div className="flex items-end">
                <Button onClick={resetFilters} variant="secondary" size="sm" className="w-full">
                  重置過濾器
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 音樂棋盤 - 按八度分行 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            音樂棋盤
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            {filters.highlightBestFrequencies && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-200 border border-green-400 inline-block" />
                最佳音符
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-700 inline-block" />
              半音
            </span>
          </div>
        </div>

        {allNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            沒有符合條件的音符，請調整過濾器設置
          </div>
        ) : (
          <div className="space-y-1.5 overflow-x-auto">
            {Array.from(notesByOctave.entries()).map(([octave, notes]) => (
              <div key={octave} className="flex items-center gap-1.5">
                {/* 八度標籤 */}
                <div className="w-8 flex-shrink-0 text-xs font-mono text-gray-600 text-right pr-1">
                  C{octave}
                </div>
                {/* 音符格子 */}
                <div className="flex gap-1 flex-1 min-w-0">
                  {notes.map((note) => (
                    <button
                      key={`${note.name}${note.octave}`}
                      onClick={() => handleNoteClick(note)}
                      disabled={disabled}
                      className={`
                        relative flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14
                        ${getNoteStyle(note)}
                        border rounded-lg flex flex-col items-center justify-center
                        transition-all duration-150 hover:scale-105
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      title={`${note.name}${note.octave} (${note.frequency.toFixed(1)}Hz, ${(note.volume ?? 0).toFixed(1)}dB)`}
                      aria-label={`音符 ${note.name}${note.octave}, 頻率 ${note.frequency.toFixed(0)}赫茲, 音量 ${(note.volume ?? 0).toFixed(0)}分貝`}
                    >
                      <span className="text-xs font-bold leading-none">{note.name}</span>
                      <span className="text-[10px] opacity-70 leading-none mt-0.5">{note.octave}</span>
                      {/* 音量指示條 */}
                      <div className="absolute bottom-0.5 left-1 right-1 h-1 bg-black/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-current opacity-40 rounded-full transition-all"
                          style={{ width: `${getVolumeBarHeight(note)}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 已選音符 */}
      {selectedNotes.length > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-blue-900">
              已選音符 ({selectedNotes.length})
            </h4>
            {onNotesClear && (
              <Button onClick={onNotesClear} variant="secondary" size="sm">
                清空全部
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedNotes.map((note, index) => (
              <div
                key={`selected-${note.name}${note.octave}-${index}`}
                className="group flex items-center gap-1 bg-blue-600 text-white pl-3 pr-1.5 py-1.5 rounded-lg text-sm font-medium"
              >
                <span>{note.name}{note.octave}</span>
                <span className="opacity-70 text-xs">
                  {note.frequency.toFixed(0)}Hz
                </span>
                {onNoteRemove && (
                  <button
                    onClick={() => onNoteRemove(index)}
                    className="ml-1 p-0.5 rounded hover:bg-blue-500 transition-colors opacity-70 hover:opacity-100"
                    aria-label={`移除音符 ${note.name}${note.octave}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
