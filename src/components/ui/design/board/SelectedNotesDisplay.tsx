// Selected Notes Display 已選音符顯示組件

import React from 'react';
import { Note } from '../../../../types';
import { Button } from '../../common/Button';

export interface SelectedNotesDisplayProps {
  selectedNotes: Note[];
  onRemoveNote?: (index: number) => void;
  onClearAll?: () => void;
  onPlayPreview?: (note: Note) => void;
  readOnly?: boolean;
}

export const SelectedNotesDisplay: React.FC<SelectedNotesDisplayProps> = ({
  selectedNotes,
  onRemoveNote,
  onClearAll,
  onPlayPreview,
  readOnly = false
}) => {
  // 計算統計信息
  const stats = React.useMemo(() => {
    if (selectedNotes.length === 0) return null;

    const totalDuration = selectedNotes.reduce((sum, note) => sum + note.duration, 0);
    const avgFrequency = selectedNotes.reduce((sum, note) => sum + note.frequency, 0) / selectedNotes.length;
    const avgSPL = selectedNotes.reduce((sum, note) => sum + (note.spl || 0), 0) / selectedNotes.length;
    const uniqueOctaves = new Set(selectedNotes.map(note => note.octave)).size;

    return {
      count: selectedNotes.length,
      totalDuration: totalDuration / 1000, // 轉換為秒
      avgFrequency,
      avgSPL,
      uniqueOctaves
    };
  }, [selectedNotes]);

  if (selectedNotes.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
        <div className="text-gray-400 mb-3">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">尚未選擇音符</h4>
        <p className="text-gray-500">從上方的音樂棋盤選擇音符開始創作</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-blue-900">
          已選音符 ({selectedNotes.length})
        </h4>
        {!readOnly && selectedNotes.length > 0 && (
          <Button
            onClick={onClearAll}
            variant="secondary"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            清空全部
          </Button>
        )}
      </div>

      {/* 統計信息 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white p-3 rounded-lg">
            <div className="font-medium text-gray-900">{stats.count}</div>
            <div className="text-sm text-gray-500">音符總數</div>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <div className="font-medium text-gray-900">{stats.totalDuration.toFixed(1)}s</div>
            <div className="text-sm text-gray-500">總時長</div>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <div className="font-medium text-gray-900">{stats.avgFrequency.toFixed(0)}Hz</div>
            <div className="text-sm text-gray-500">平均頻率</div>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <div className="font-medium text-gray-900">{stats.avgSPL.toFixed(1)}dB</div>
            <div className="text-sm text-gray-500">平均音量</div>
          </div>
        </div>
      )}

      {/* 音符列表 */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {selectedNotes.map((note, index) => (
          <div
            key={`selected-${note.name}${note.octave}-${index}`}
            className="bg-white rounded-lg p-3 flex items-center justify-between border border-blue-200"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                {note.name}
                <sub className="text-xs">{note.octave}</sub>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900">
                  {note.frequency.toFixed(1)}Hz
                </div>
                <div className="text-gray-500">
                  {note.duration}ms • {(note.spl || 0).toFixed(1)}dB
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* 順序號 */}
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                #{index + 1}
              </span>

              {/* 預覽按鈕 */}
              <Button
                onClick={() => onPlayPreview?.(note)}
                variant="secondary"
                size="sm"
                className="px-2"
                icon={
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                }
                title="預覽音符"
              />

              {/* 移除按鈕 */}
              {!readOnly && (
                <Button
                  onClick={() => onRemoveNote?.(index)}
                  variant="secondary"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 px-2"
                  icon={
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  }
                  title="移除音符"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 操作提示 */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <div className="flex items-center justify-between text-sm">
          <div className="text-blue-700">
            💡 提示：選擇的音符會按照順序添加到編輯器中
          </div>
          {stats && stats.uniqueOctaves > 1 && (
            <div className="text-amber-700 bg-amber-50 px-2 py-1 rounded">
              跨越 {stats.uniqueOctaves} 個八度
            </div>
          )}
        </div>
      </div>
    </div>
  );
};