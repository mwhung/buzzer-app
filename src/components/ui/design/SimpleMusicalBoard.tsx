// 簡化版音樂棋盤組件 - 避免無限循環問題

import React, { useState, useCallback } from 'react';
import { Note } from '../../../types';
import { MusicTheory } from '../../../modules/music/MusicTheory';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';

interface GridNote {
  noteName: string;  // 'Space', 'C', 'C#', etc.
  octave: number;    // 3, 4, 5, 6
  frequency: number; // 0 for Space, calculated for others
  volume: number;    // SPL value from buzzer profile
  displayName: string; // 顯示名稱
}

interface SimpleMusicalBoardProps {
  className?: string;
  onNotesInsert?: (notes: Note[]) => void;
}

export const SimpleMusicalBoard: React.FC<SimpleMusicalBoardProps> = ({
  className = '',
  onNotesInsert
}) => {
  const { currentProfile, appCore } = useBuzzerApp();

  // 已選擇的音符序列
  const [selectedSequence, setSelectedSequence] = useState<GridNote[]>([]);

  // 定義音符名稱（包含 Space）
  const noteNames = ['Space', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octaves = [3, 4, 5, 6];

  // 創建棋盤格音符
  const createGridNote = useCallback((noteName: string, octave: number): GridNote => {
    if (noteName === 'Space') {
      return {
        noteName: 'Space',
        octave,
        frequency: 0,
        volume: 0,
        displayName: ''
      };
    }

    const frequency = MusicTheory.noteToFrequency(noteName, octave);
    // 從 buzzer profile 計算音量
    const volume = currentProfile && appCore
      ? Math.round(appCore.audioEngine.calculateVolume(frequency, currentProfile) || 0)
      : 0;

    return {
      noteName,
      octave,
      frequency: Math.round(frequency),
      volume,
      displayName: `${noteName}${octave}`
    };
  }, [currentProfile, appCore]);

  // 處理格子點擊
  const handleGridClick = useCallback((gridNote: GridNote) => {
    // 添加到選擇序列
    setSelectedSequence(prev => [...prev, gridNote]);

    // 播放音符預覽（如果不是休止符）
    if (gridNote.frequency > 0 && appCore && currentProfile) {
      const note: Note = {
        name: gridNote.noteName,
        octave: gridNote.octave,
        frequency: gridNote.frequency,
        duration: 500,
        volume: gridNote.volume
      };
      appCore.audioEngine.playNote(note, currentProfile).catch(console.error);
    }
  }, [appCore, currentProfile]);

  // 清空選擇
  const handleClearSelection = useCallback(() => {
    setSelectedSequence([]);
  }, []);

  // 移除個別音符
  const handleRemoveNote = useCallback((indexToRemove: number) => {
    setSelectedSequence(prev => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  // 插入到 Pattern
  const handleInsertToPattern = useCallback(() => {
    if (selectedSequence.length === 0) return;

    // 轉換為 Note 格式
    const notes: Note[] = selectedSequence.map(gridNote => ({
      name: gridNote.noteName,
      octave: gridNote.octave,
      frequency: gridNote.frequency,
      duration: 500,
      volume: gridNote.volume // 使用 buzzer profile 計算的音量
    }));

    // 傳遞給父組件
    onNotesInsert?.(notes);

    // 清空選擇
    setSelectedSequence([]);
  }, [selectedSequence, onNotesInsert]);

  if (!currentProfile) {
    return (
      <div className={`bg-gray-50 rounded-xl p-8 text-center ${className}`}>
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">請先選擇 Buzzer Profile</h3>
        <p className="text-gray-500">選擇 Profile 後即可使用音樂棋盤</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">音樂棋盤</h3>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">點擊格子選擇音符，Space 為休止符</p>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">{currentProfile?.buzzer_name || 'Default Buzzer'}</div>
            <div className="text-xs text-gray-500">當前 Profile</div>
          </div>
        </div>
      </div>

      {/* 棋盤格 */}
      <div className="mb-6">
        {/* 棋盤容器 */}
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* 表頭 */}
            <div className="flex mb-2">
              <div className="w-20 text-xs font-medium text-gray-500 text-center py-2 flex items-center justify-center">
                八度
              </div>
              {noteNames.map((noteName) => (
                <div key={noteName} className="w-20 text-xs font-medium text-gray-500 text-center py-2 flex items-center justify-center">
                  {noteName === 'Space' ? 'Space' : noteName}
                </div>
              ))}
            </div>

            {/* 棋盤內容 */}
            {octaves.map((octave) => (
              <div key={octave} className="flex gap-1 mb-1">
                {/* 八度標籤 */}
                <div className="w-20 text-sm font-medium text-gray-700 text-center py-3 bg-gray-50 rounded flex items-center justify-center">
                  {octave}
                </div>

                {/* 音符格子 */}
                {noteNames.map((noteName) => {
                  const gridNote = createGridNote(noteName, octave);
                  const isSelected = selectedSequence.some(
                    selected => selected.noteName === noteName && selected.octave === octave
                  );

                  return (
                    <button
                      key={`${noteName}-${octave}`}
                      onClick={() => handleGridClick(gridNote)}
                      className={`
                        w-20 h-16 text-xs font-medium rounded border transition-colors flex flex-col items-center justify-center p-1
                        ${isSelected
                          ? 'bg-blue-500 text-white border-blue-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }
                        ${noteName === 'Space' ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' : ''}
                      `}
                    >
                      {noteName === 'Space' ? (
                        <div className="text-xs">Rest</div>
                      ) : (
                        <>
                          <div className="font-semibold text-sm leading-tight">{gridNote.frequency}</div>
                          <div className="text-xs text-gray-600 leading-tight">{gridNote.volume}</div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 已選擇的音符顯示 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          已選擇音符 ({selectedSequence.length})
        </h4>
        <div className="bg-gray-50 rounded-lg p-3 min-h-[40px]">
          {selectedSequence.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedSequence.map((note, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 group"
                >
                  <span>{index + 1}. {note.displayName || 'Rest'}</span>
                  <button
                    onClick={() => handleRemoveNote(index)}
                    className="ml-1 text-blue-600 hover:text-red-600 hover:bg-red-100 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                    title="移除此音符"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">尚未選擇任何音符</p>
          )}
        </div>
      </div>

      {/* 控制按鈕 */}
      <div className="flex gap-3">
        <button
          onClick={handleInsertToPattern}
          disabled={selectedSequence.length === 0}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          插入到模式編輯器
        </button>
        <button
          onClick={handleClearSelection}
          disabled={selectedSequence.length === 0}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          清空選擇
        </button>
      </div>
    </div>
  );
};