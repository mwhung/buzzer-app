// Board Grid 棋盤網格組件

import React from 'react';
import { Note } from '../../../../types';

export interface BoardGridProps {
  notes: Note[];
  selectedNotes: Note[];
  bestNotes: Set<string>;
  onNoteClick: (note: Note) => void;
  disabled?: boolean;
  highlightBest?: boolean;
}

export const BoardGrid: React.FC<BoardGridProps> = ({
  notes,
  selectedNotes,
  bestNotes,
  onNoteClick,
  disabled = false,
  highlightBest = true
}) => {
  // 檢查音符是否被選中
  const isNoteSelected = React.useCallback((note: Note) => {
    return selectedNotes.some(
      selected => selected.name === note.name && selected.octave === note.octave
    );
  }, [selectedNotes]);

  // 獲取音符顏色類
  const getNoteColorClass = React.useCallback((note: Note) => {
    const isSelected = isNoteSelected(note);
    const isBest = highlightBest && bestNotes.has(`${note.name}${note.octave}`);

    if (isSelected) {
      return 'bg-blue-600 text-white border-blue-700';
    }

    if (isBest) {
      return 'bg-green-100 text-green-900 border-green-300 hover:bg-green-200';
    }

    // 根據SPL值決定顏色深淺
    const intensity = Math.min((note.spl || 0) / 80, 1);
    const opacity = 0.1 + intensity * 0.4;

    return `bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900`;
  }, [isNoteSelected, highlightBest, bestNotes]);

  // 獲取音符尺寸類（根據SPL值）
  const getNoteSizeClass = React.useCallback((note: Note) => {
    const spl = note.spl || 0;
    if (spl > 70) return 'w-12 h-12 text-sm';
    if (spl > 50) return 'w-10 h-10 text-xs';
    return 'w-8 h-8 text-xs';
  }, []);

  // 處理音符點擊
  const handleNoteClick = React.useCallback((note: Note) => {
    if (disabled) return;
    onNoteClick(note);
  }, [disabled, onNoteClick]);

  if (notes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">音樂棋盤</h3>
        <div className="text-center py-8 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <h4 className="text-lg font-medium text-gray-900 mb-2">沒有符合條件的音符</h4>
          <p className="text-gray-500">請調整過濾器設置以顯示音符</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          音樂棋盤
        </h3>
        {highlightBest && (
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>
              <span className="text-green-700">最佳音符</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
              <span className="text-blue-700">已選擇</span>
            </div>
          </div>
        )}
      </div>

      {/* 音符網格 */}
      <div className="grid grid-cols-12 gap-2 mb-4">
        {notes.map((note, index) => {
          const isSelected = isNoteSelected(note);
          const sizeClass = getNoteSizeClass(note);
          const colorClass = getNoteColorClass(note);

          return (
            <button
              key={`${note.name}${note.octave}-${index}`}
              onClick={() => handleNoteClick(note)}
              disabled={disabled}
              className={`
                ${sizeClass}
                ${colorClass}
                border rounded-lg flex items-center justify-center
                transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                font-medium relative
              `}
              title={`${note.name}${note.octave} (${note.frequency.toFixed(1)}Hz, ${(note.spl || 0).toFixed(1)}dB)`}
            >
              <div className="text-center">
                <div className="leading-none">{note.name}</div>
                <div className="text-xs opacity-75">{note.octave}</div>
              </div>

              {/* SPL 指示器 */}
              {(note.spl || 0) > 60 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white"
                     title={`高音量: ${(note.spl || 0).toFixed(1)}dB`} />
              )}

              {/* 選中指示器 */}
              {isSelected && (
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-600 rounded-full border border-white">
                  <svg className="w-2 h-2 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 使用說明 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">使用說明</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
          <div>• 點擊音符添加到編輯器</div>
          <div>• 音符大小代表音量強度</div>
          <div>• 綠色音符為最佳頻率響應</div>
          <div>• 黃點表示高音量音符</div>
        </div>
      </div>

      {/* 鍵盤快捷鍵提示 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">快捷操作</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>雙擊: 預覽音符</div>
          <div>Shift+點擊: 批量選擇</div>
        </div>
      </div>
    </div>
  );
};