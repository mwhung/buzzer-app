// Pattern Card 單個模式卡片組件

import React from 'react';
import { Pattern } from '../../../../types';
import { useBuzzerApp } from '../../../../hooks/useBuzzerApp';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';

export interface PatternCardProps {
  pattern: Pattern;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: (pattern: Pattern) => void;
  onEdit: (pattern: Pattern) => void;
  onToggleCheck: (patternId: string) => void;
  onDuplicate: (pattern: Pattern) => void;
  onDelete: (patternId: string) => void;
}

interface PatternStats {
  totalDuration: number;
  uniqueNotes: number;
  avgVolume: number;
  noteCount: number;
}

export const PatternCard: React.FC<PatternCardProps> = ({
  pattern,
  isSelected,
  isChecked,
  onSelect,
  onEdit,
  onToggleCheck,
  onDuplicate,
  onDelete
}) => {
  const { appCore } = useBuzzerApp();

  // 獲取pattern統計
  const getPatternStats = React.useCallback((pattern: Pattern): PatternStats => {
    const notes = pattern.notes || [];
    const totalDuration = notes.reduce((sum, note) => sum + note.duration, 0);
    const uniqueNotes = new Set(notes.map(note => `${note.name}${note.octave}`)).size;
    const avgVolume = notes.length > 0 ?
      notes.reduce((sum, note) => sum + note.volume, 0) / notes.length : 0;

    return {
      totalDuration: totalDuration / 1000,
      uniqueNotes,
      avgVolume,
      noteCount: notes.length
    };
  }, []);

  // 處理複製
  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!appCore) return;

    const duplicatedPattern: Pattern = {
      ...pattern,
      id: `pattern-${Date.now()}`,
      name: `${pattern.name} (副本)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const success = await appCore.patternManager.createPattern(duplicatedPattern);
    if (success) {
      onDuplicate(duplicatedPattern);
    } else {
      alert('複製模式失敗');
    }
  };

  // 處理刪除
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('確定要刪除此模式嗎？此操作無法撤銷。')) {
      onDelete(pattern.id);
    }
  };

  const stats = getPatternStats(pattern);

  return (
    <div
      className="cursor-pointer transition-all duration-200 hover:scale-105"
      onClick={() => onSelect(pattern)}
    >
      <Card
        variant={isSelected ? 'highlighted' : 'default'}
        className={isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
      >
        <div className="space-y-4">
          {/* 選擇框和標題 */}
          <div className="flex items-start justify-between">
            <label
              className="flex items-center cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggleCheck(pattern.id)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-500">選擇</span>
            </label>

            {isSelected && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                使用中
              </span>
            )}
          </div>

          {/* Pattern名稱和信息 */}
          <div onClick={() => onSelect(pattern)}>
            <h3 className="font-semibold text-gray-900 mb-2">{pattern.name}</h3>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <div className="font-medium text-gray-900">{stats.noteCount}</div>
                <div className="text-gray-500">音符數</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="font-medium text-gray-900">{stats.totalDuration.toFixed(1)}s</div>
                <div className="text-gray-500">時長</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="font-medium text-gray-900">{stats.uniqueNotes}</div>
                <div className="text-gray-500">音符種類</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="font-medium text-gray-900">{stats.avgVolume.toFixed(1)}dB</div>
                <div className="text-gray-500">平均音量</div>
              </div>
            </div>

            {/* 節拍和版本信息 */}
            <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
              <span>節拍: {pattern.tempo} BPM</span>
              <span>v{pattern.version}</span>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(pattern);
              }}
              variant={isSelected ? 'success' : 'primary'}
              size="sm"
              className="flex-1"
              disabled={isSelected}
            >
              {isSelected ? '已選擇' : '選擇'}
            </Button>

            <Button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(pattern);
              }}
              variant="secondary"
              size="sm"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            >
              編輯
            </Button>

            {/* 更多操作下拉菜單 */}
            <div className="relative group">
              <Button
                variant="secondary"
                size="sm"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                }
              />

              {/* 下拉菜單 */}
              <div className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <button
                  onClick={handleDuplicate}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                >
                  複製
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};