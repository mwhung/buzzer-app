// Pattern Metadata 模式元數據編輯組件

import React from 'react';
import { Pattern } from '../../../../types';

export interface PatternMetadataProps {
  pattern: Pattern;
  onPatternChange: (updates: Partial<Pattern>) => void;
  readOnly?: boolean;
}

export const PatternMetadata: React.FC<PatternMetadataProps> = ({
  pattern,
  onPatternChange,
  readOnly = false
}) => {
  // 更新模式名稱
  const handleNameChange = React.useCallback((name: string) => {
    onPatternChange({ name });
  }, [onPatternChange]);

  // BPM 設定已移除，保持預設值

  // 計算模式統計
  const stats = React.useMemo(() => {
    const notes = pattern.notes || [];
    const totalDuration = notes.reduce((sum, note) => sum + note.duration, 0);
    const uniqueNotes = new Set(notes.map(note => `${note.name}${note.octave}`)).size;
    const avgVolume = notes.length > 0
      ? notes.reduce((sum, note) => sum + (note.volume || 0), 0) / notes.length
      : 0;

    return {
      noteCount: notes.length,
      totalDuration: totalDuration / 1000, // 轉換為秒
      uniqueNotes,
      avgVolume
    };
  }, [pattern.notes]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3">模式信息</h3>

      <div className="space-y-3">
        {/* 模式名稱 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            模式名稱
          </label>
          <input
            type="text"
            value={pattern.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            readOnly={readOnly}
            placeholder="輸入模式名稱"
          />
        </div>

        {/* 統計信息 - 簡化顯示 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-blue-50 p-2 rounded">
            <div className="font-medium text-blue-900">{stats.noteCount}</div>
            <div className="text-blue-600">音符數</div>
          </div>
          <div className="bg-green-50 p-2 rounded">
            <div className="font-medium text-green-900">{stats.totalDuration.toFixed(1)}s</div>
            <div className="text-green-600">時長</div>
          </div>
        </div>

        {/* 創建和修改時間 */}
        <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>創建: {pattern.createdAt ? new Date(pattern.createdAt).toLocaleDateString() : '今天'}</span>
          <span>修改: {pattern.modifiedAt ? new Date(pattern.modifiedAt).toLocaleTimeString() : '剛剛'}</span>
        </div>

        {/* 模式預覽波形 - 更簡潔版本 */}
        {stats.noteCount > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-700 mb-1">預覽</div>
            <div className="flex items-end space-x-0.5 h-8 bg-gray-50 rounded p-1 overflow-x-auto">
              {(pattern.notes || []).map((note, index) => {
                const height = Math.max(2, (note.volume || 50) / 100 * 20);
                const isLowNote = note.octave <= 3;
                const isMidNote = note.octave > 3 && note.octave <= 5;
                const isHighNote = note.octave > 5;

                return (
                  <div
                    key={index}
                    className={`
                      min-w-[2px] rounded-t
                      ${isLowNote ? 'bg-red-400' : ''}
                      ${isMidNote ? 'bg-blue-400' : ''}
                      ${isHighNote ? 'bg-green-400' : ''}
                    `}
                    style={{ height: `${height}px` }}
                    title={`${note.name}${note.octave} - ${note.duration}ms`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};