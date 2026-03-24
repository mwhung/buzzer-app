// Pattern Editor 模式編輯器組件

import { useState, useEffect, useRef } from 'react';
import { Pattern, Note } from '../../../types';
import { MusicTheory } from '../../../modules/music/MusicTheory';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useToast } from '../common/Toast';

export interface PatternEditorProps {
  pattern?: Pattern;
  onPatternChange?: (pattern: Pattern) => void;
  onSave?: (pattern: Pattern) => void;
  className?: string;
  readOnly?: boolean;
  currentPlayingIndex?: number;
}

interface DragState {
  isDragging: boolean;
  dragIndex: number;
  dropIndex: number;
}

export const PatternEditor: React.FC<PatternEditorProps> = ({
  pattern,
  onPatternChange,
  onSave,
  className = '',
  readOnly = false,
  currentPlayingIndex = -1
}) => {
  const { currentProfile, appCore } = useBuzzerApp();
  const { showToast } = useToast();

  // 編輯狀態
  const [editingPattern, setEditingPattern] = useState<Pattern>(
    pattern || {
      id: `pattern-${Date.now()}`,
      name: '新模式',
      pattern: [],
      notes: [],
      tempo: 120,
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  );

  // 確認清空對話框
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 拖拽狀態
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: -1,
    dropIndex: -1
  });

  const dragItemRef = useRef<HTMLDivElement>(null);

  // 深度比較兩個Pattern是否相等
  const patternsEqual = (p1: Pattern | null, p2: Pattern | null): boolean => {
    if (p1 === p2) return true;
    if (!p1 || !p2) return false;

    return (
      p1.id === p2.id &&
      p1.name === p2.name &&
      p1.tempo === p2.tempo &&
      JSON.stringify(p1.notes || []) === JSON.stringify(p2.notes || [])
    );
  };

  // 同步外部pattern變更
  useEffect(() => {
    if (pattern && !patternsEqual(pattern, editingPattern)) {
      setEditingPattern(pattern);
    }
  }, [pattern]);

  // 通知外部pattern變更
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onPatternChange?.(editingPattern);
  }, [editingPattern, onPatternChange]);

  // 移除音符
  const removeNote = (index: number) => {
    if (readOnly) return;

    setEditingPattern(prev => ({
      ...prev,
      notes: prev.notes.filter((_, i) => i !== index),
      updated_at: new Date().toISOString()
    }));
  };

  // 更新音符
  const updateNote = (index: number, updates: Partial<Note>) => {
    if (readOnly) return;

    setEditingPattern(prev => ({
      ...prev,
      notes: prev.notes.map((note, i) =>
        i === index ? { ...note, ...updates } : note
      ),
      updated_at: new Date().toISOString()
    }));
  };

  // 調整音符八度
  const adjustNoteOctave = (index: number, direction: 'up' | 'down') => {
    if (readOnly) return;

    const note = editingPattern.notes[index];
    const newOctave = direction === 'up' ? note.octave + 1 : note.octave - 1;

    if (newOctave < 0 || newOctave > 8) return;

    const newFrequency = MusicTheory.noteToFrequency(note.name, newOctave);
    const newVolume = currentProfile ?
      appCore?.audioEngine.calculateVolume(newFrequency, currentProfile) || 0 : 0;

    updateNote(index, {
      octave: newOctave,
      frequency: newFrequency,
      volume: newVolume
    });
  };

  // 上移/下移音符（鍵盤替代拖拽）
  const moveNote = (index: number, direction: 'up' | 'down') => {
    if (readOnly) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editingPattern.notes.length) return;

    const newNotes = [...editingPattern.notes];
    [newNotes[index], newNotes[newIndex]] = [newNotes[newIndex], newNotes[index]];
    setEditingPattern(prev => ({
      ...prev,
      notes: newNotes,
      updated_at: new Date().toISOString()
    }));
  };

  // 拖拽開始
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (readOnly) return;
    setDragState({ isDragging: true, dragIndex: index, dropIndex: -1 });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  // 拖拽經過
  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (readOnly || !dragState.isDragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragState(prev => ({ ...prev, dropIndex: index }));
  };

  // 拖拽結束
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (readOnly || !dragState.isDragging) return;
    e.preventDefault();

    const { dragIndex } = dragState;
    if (dragIndex === dropIndex) {
      setDragState({ isDragging: false, dragIndex: -1, dropIndex: -1 });
      return;
    }

    const newNotes = [...editingPattern.notes];
    const draggedNote = newNotes[dragIndex];
    newNotes.splice(dragIndex, 1);
    newNotes.splice(dropIndex, 0, draggedNote);

    setEditingPattern(prev => ({
      ...prev,
      notes: newNotes,
      updated_at: new Date().toISOString()
    }));

    setDragState({ isDragging: false, dragIndex: -1, dropIndex: -1 });
  };

  // 清空模式
  const clearPattern = () => {
    if (readOnly) return;
    setEditingPattern(prev => ({
      ...prev,
      notes: [],
      updated_at: new Date().toISOString()
    }));
    setShowClearConfirm(false);
    showToast('info', '音符序列已清空');
  };

  // 保存模式
  const handleSave = () => {
    onSave?.(editingPattern);
    showToast('success', '模式已保存');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 模式信息和控制區 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={editingPattern.name}
              onChange={(e) => !readOnly && setEditingPattern(prev => ({
                ...prev,
                name: e.target.value,
                updated_at: new Date().toISOString()
              }))}
              className="text-base font-semibold text-gray-900 border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full sm:w-auto"
              readOnly={readOnly}
              placeholder="模式名稱"
              aria-label="模式名稱"
            />
            <div className="text-xs text-gray-600 mt-1 px-2">
              {editingPattern.notes.length} 個音符 | {editingPattern.tempo} BPM
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-gray-700">節拍:</label>
              <input
                type="number" min="60" max="200"
                value={editingPattern.tempo}
                onChange={(e) => !readOnly && setEditingPattern(prev => ({
                  ...prev,
                  tempo: parseInt(e.target.value) || 120,
                  updated_at: new Date().toISOString()
                }))}
                className="w-16 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                readOnly={readOnly}
                aria-label="節拍 BPM"
              />
            </div>

            {!readOnly && (
              <>
                <Button
                  onClick={() => setShowClearConfirm(true)}
                  variant="secondary"
                  size="sm"
                  disabled={!editingPattern.notes || editingPattern.notes.length === 0}
                >
                  清空
                </Button>

                <Button
                  onClick={handleSave}
                  variant="primary"
                  size="sm"
                  disabled={!editingPattern.notes || editingPattern.notes.length === 0}
                >
                  保存模式
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 模式統計 */}
        {editingPattern.notes.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="font-semibold text-gray-900">{editingPattern.notes.length}</div>
                <div className="text-gray-600">音符數量</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {(editingPattern.notes?.reduce((sum, note) => sum + note.duration, 0) / 1000 || 0).toFixed(1)}s
                </div>
                <div className="text-gray-600">總時長</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {editingPattern.notes?.length > 0 ? Math.min(...editingPattern.notes.map(n => n.frequency)).toFixed(0) : 0}Hz
                </div>
                <div className="text-gray-600">最低頻率</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {editingPattern.notes?.length > 0 ? Math.max(...editingPattern.notes.map(n => n.frequency)).toFixed(0) : 0}Hz
                </div>
                <div className="text-gray-600">最高頻率</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 音符序列編輯區 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          音符序列
          {currentPlayingIndex >= 0 && (
            <span className="ml-2 text-xs font-normal text-green-600 animate-pulse">
              播放中: {currentPlayingIndex + 1}/{editingPattern.notes.length}
            </span>
          )}
        </h3>

        {editingPattern.notes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">
              <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">從上方音樂棋盤選擇音符來開始編輯</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
            {editingPattern.notes.map((note, index) => (
              <div
                key={`${note.name}${note.octave}-${index}`}
                ref={index === dragState.dragIndex ? dragItemRef : null}
                draggable={!readOnly}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`
                  group relative rounded-lg p-3 border transition-all duration-150
                  ${currentPlayingIndex === index
                    ? 'border-green-400 bg-green-50 shadow-sm shadow-green-100'
                    : 'border-gray-200 bg-gray-50'}
                  ${dragState.isDragging && index === dragState.dragIndex ? 'opacity-40' : ''}
                  ${dragState.isDragging && index === dragState.dropIndex ? 'border-blue-400 bg-blue-50' : ''}
                  ${!readOnly ? 'hover:border-gray-300 cursor-move' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  {/* 序號 + 拖拽指示器 */}
                  {!readOnly && (
                    <div className="flex-shrink-0 text-gray-400 group-hover:text-gray-600 cursor-grab active:cursor-grabbing">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                  )}

                  {/* 序號 */}
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>

                  {/* 音符信息 - 響應式佈局 */}
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900 min-w-[48px]">
                        {note.name}{note.octave}
                      </span>
                      <span className="text-xs text-gray-600">
                        {note.frequency.toFixed(1)}Hz
                      </span>
                      <span className="text-xs text-gray-600">
                        {(note.volume ?? 0).toFixed(1)}dB
                      </span>
                    </div>

                    {/* 時長控制 */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-gray-600">時長:</label>
                      <input
                        type="number" min="100" max="5000" step="50"
                        value={note.duration}
                        onChange={(e) => updateNote(index, { duration: parseInt(e.target.value) || 500 })}
                        className="w-16 text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        readOnly={readOnly}
                        aria-label={`音符 ${note.name}${note.octave} 時長`}
                      />
                      <span className="text-xs text-gray-600">ms</span>
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  {!readOnly && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* 上移/下移 */}
                      <button
                        onClick={() => moveNote(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="上移"
                        aria-label="上移音符"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveNote(index, 'down')}
                        disabled={index === editingPattern.notes.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="下移"
                        aria-label="下移音符"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* 八度調整 */}
                      <div className="flex flex-col mx-0.5">
                        <button
                          onClick={() => adjustNoteOctave(index, 'up')}
                          disabled={note.octave >= 8}
                          className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="提高八度"
                          aria-label="提高八度"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <span className="text-[9px] text-gray-400 text-center leading-none">8ve</span>
                        <button
                          onClick={() => adjustNoteOctave(index, 'down')}
                          disabled={note.octave <= 0}
                          className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="降低八度"
                          aria-label="降低八度"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* 刪除按鈕 */}
                      <button
                        onClick={() => removeNote(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        title="刪除音符"
                        aria-label="刪除音符"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 確認清空對話框 */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onConfirm={clearPattern}
        onCancel={() => setShowClearConfirm(false)}
        title="清空音符序列"
        message={`確定要清空所有 ${editingPattern.notes.length} 個音符嗎？此操作無法撤銷。`}
        confirmText="清空"
        variant="danger"
      />
    </div>
  );
};
