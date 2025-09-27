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

  // 更新節拍
  const handleTempoChange = React.useCallback((tempo: number) => {
    const validTempo = Math.max(60, Math.min(200, tempo));
    onPatternChange({ tempo: validTempo });
  }, [onPatternChange]);

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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">模式信息</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模式名稱
            </label>
            <input
              type="text"
              value={pattern.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              readOnly={readOnly}
              placeholder="輸入模式名稱"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              節拍 (BPM)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="60"
                max="200"
                value={pattern.tempo}
                onChange={(e) => handleTempoChange(parseInt(e.target.value) || 120)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly={readOnly}
              />
              <input
                type="range"
                min="60"
                max="200"
                value={pattern.tempo}
                onChange={(e) => handleTempoChange(parseInt(e.target.value))}
                className="flex-1"
                disabled={readOnly}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              每分鐘 {pattern.tempo} 拍
            </div>
          </div>

          {/* 版本信息 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-medium text-gray-900">v{pattern.version || '1.0'}</div>
              <div className="text-gray-500">版本</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-medium text-gray-900">{pattern.id.split('-')[1] || 'N/A'}</div>
              <div className="text-gray-500">ID</div>
            </div>
          </div>
        </div>

        {/* 統計信息 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">模式統計</h4>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-medium text-blue-900">{stats.noteCount}</div>
              <div className="text-blue-600">音符總數</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="font-medium text-green-900">{stats.totalDuration.toFixed(1)}s</div>
              <div className="text-green-600">總時長</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="font-medium text-purple-900">{stats.uniqueNotes}</div>
              <div className="text-purple-600">音符種類</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="font-medium text-orange-900">{stats.avgVolume.toFixed(1)}%</div>
              <div className="text-orange-600">平均音量</div>
            </div>
          </div>

          {/* 時間信息 */}
          <div className="space-y-2 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>創建時間:</span>
              <span>{pattern.createdAt ? new Date(pattern.createdAt).toLocaleString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>修改時間:</span>
              <span>{pattern.modifiedAt ? new Date(pattern.modifiedAt).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 模式預覽波形 (簡化版) */}
      {stats.noteCount > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">模式預覽</h4>
          <div className="flex items-end space-x-1 h-16 bg-gray-50 rounded-lg p-3 overflow-x-auto">
            {(pattern.notes || []).map((note, index) => {
              const height = Math.max(8, (note.volume || 50) / 100 * 40);
              const isLowNote = note.octave <= 3;
              const isMidNote = note.octave > 3 && note.octave <= 5;
              const isHighNote = note.octave > 5;

              return (
                <div
                  key={index}
                  className={`
                    min-w-[4px] rounded-t
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
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>低音 (0-3)</span>
            <span>中音 (4-5)</span>
            <span>高音 (6-8)</span>
          </div>
        </div>
      )}
    </div>
  );
};