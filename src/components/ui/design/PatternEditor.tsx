// Pattern Editor 模式編輯器組件

import React, { useState, useEffect, useRef } from 'react';
import { Pattern, Note } from '../../../types';
import { MusicTheory } from '../../../modules/music/MusicTheory';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';
import { Button } from '../common/Button';

export interface PatternEditorProps {
  pattern?: Pattern;
  onPatternChange?: (pattern: Pattern) => void;
  onSave?: (pattern: Pattern) => void;
  className?: string;
  readOnly?: boolean;
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
  readOnly = false
}) => {
  const { currentProfile, appCore } = useBuzzerApp();

  // 編輯狀態
  const [editingPattern, setEditingPattern] = useState<Pattern>(
    pattern || {
      id: `pattern-${Date.now()}`,
      name: '新模式',
      notes: [],
      tempo: 120,
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  );

  // 拖拽狀態
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: -1,
    dropIndex: -1
  });

  // 播放狀態
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(-1);

  // 引用
  const dragItemRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // 同步外部pattern變更
  useEffect(() => {
    if (pattern) {
      setEditingPattern(pattern);
    }
  }, [pattern]);

  // 通知外部pattern變更
  useEffect(() => {
    onPatternChange?.(editingPattern);
  }, [editingPattern, onPatternChange]);

  // 添加音符
  const addNote = (note: Note) => {
    if (readOnly) return;

    const newNote: Note = {
      ...note,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setEditingPattern(prev => ({
      ...prev,
      notes: [...prev.notes, newNote],
      updated_at: new Date().toISOString()
    }));
  };

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

  // 拖拽開始
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (readOnly) return;

    setDragState({
      isDragging: true,
      dragIndex: index,
      dropIndex: -1
    });

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  // 拖拽經過
  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (readOnly || !dragState.isDragging) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    setDragState(prev => ({
      ...prev,
      dropIndex: index
    }));
  };

  // 拖拽結束
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (readOnly || !dragState.isDragging) return;

    e.preventDefault();

    const { dragIndex } = dragState;
    if (dragIndex === dropIndex) {
      setDragState({
        isDragging: false,
        dragIndex: -1,
        dropIndex: -1
      });
      return;
    }

    // 重排數組
    const newNotes = [...editingPattern.notes];
    const draggedNote = newNotes[dragIndex];
    newNotes.splice(dragIndex, 1);
    newNotes.splice(dropIndex, 0, draggedNote);

    setEditingPattern(prev => ({
      ...prev,
      notes: newNotes,
      updated_at: new Date().toISOString()
    }));

    setDragState({
      isDragging: false,
      dragIndex: -1,
      dropIndex: -1
    });
  };

  // 播放模式預覽
  const playPattern = async () => {
    if (!appCore || !currentProfile || editingPattern.notes.length === 0) return;

    setIsPlaying(true);
    setCurrentPlayingIndex(0);

    for (let i = 0; i < editingPattern.notes.length; i++) {
      if (!isPlaying) break;

      setCurrentPlayingIndex(i);
      const note = editingPattern.notes[i];

      await appCore.audioEngine.playNote(note, currentProfile);

      // 等待音符時長
      await new Promise(resolve => {
        timeoutRef.current = setTimeout(resolve, note.duration);
      });
    }

    setIsPlaying(false);
    setCurrentPlayingIndex(-1);
  };

  // 停止播放
  const stopPattern = () => {
    setIsPlaying(false);
    setCurrentPlayingIndex(-1);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    appCore?.stopPlayback();
  };

  // 清空模式
  const clearPattern = () => {
    if (readOnly) return;

    setEditingPattern(prev => ({
      ...prev,
      notes: [],
      updated_at: new Date().toISOString()
    }));
  };

  // 保存模式
  const handleSave = () => {
    onSave?.(editingPattern);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 模式信息和控制區 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={editingPattern.name}
              onChange={(e) => !readOnly && setEditingPattern(prev => ({
                ...prev,
                name: e.target.value,
                updated_at: new Date().toISOString()
              }))}
              className="text-lg font-semibold text-gray-900 border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              readOnly={readOnly}
              placeholder="模式名稱"
            />
            <div className="text-sm text-gray-500 mt-1">
              {editingPattern.notes.length} 個音符 | 節拍: {editingPattern.tempo} BPM
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">節拍:</label>
              <input
                type="number"
                min="60"
                max="200"
                value={editingPattern.tempo}
                onChange={(e) => !readOnly && setEditingPattern(prev => ({
                  ...prev,
                  tempo: parseInt(e.target.value) || 120,
                  updated_at: new Date().toISOString()
                }))}
                className="w-16 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                readOnly={readOnly}
              />
            </div>

            {!readOnly && (
              <>
                <Button
                  onClick={clearPattern}
                  variant="secondary"
                  size="sm"
                  disabled={editingPattern.notes.length === 0}
                >
                  清空
                </Button>

                <Button
                  onClick={handleSave}
                  variant="primary"
                  size="sm"
                  disabled={editingPattern.notes.length === 0}
                >
                  保存模式
                </Button>
              </>
            )}

            <Button
              onClick={isPlaying ? stopPattern : playPattern}
              variant={isPlaying ? "danger" : "success"}
              size="sm"
              disabled={editingPattern.notes.length === 0 || !currentProfile}
              icon={
                isPlaying ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )
              }
            >
              {isPlaying ? '停止' : '播放'}
            </Button>
          </div>
        </div>

        {/* 模式統計 */}
        {editingPattern.notes.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-900">
                  {editingPattern.notes.length}
                </div>
                <div className="text-gray-500">音符數量</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {(editingPattern.notes.reduce((sum, note) => sum + note.duration, 0) / 1000).toFixed(1)}s
                </div>
                <div className="text-gray-500">總時長</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {Math.min(...editingPattern.notes.map(n => n.frequency)).toFixed(0)}Hz
                </div>
                <div className="text-gray-500">最低頻率</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {Math.max(...editingPattern.notes.map(n => n.frequency)).toFixed(0)}Hz
                </div>
                <div className="text-gray-500">最高頻率</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 音符序列編輯區 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          音符序列
          {isPlaying && currentPlayingIndex >= 0 && (
            <span className="ml-2 text-sm font-normal text-blue-600">
              (播放中: {currentPlayingIndex + 1}/{editingPattern.notes.length})
            </span>
          )}
        </h3>

        {editingPattern.notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">模式為空</h4>
            <p className="text-gray-500">從音樂棋盤選擇音符來開始編輯</p>
          </div>
        ) : (
          <div className="space-y-3">
            {editingPattern.notes.map((note, index) => (
              <div
                key={`${note.name}${note.octave}-${index}`}
                ref={index === dragState.dragIndex ? dragItemRef : null}
                draggable={!readOnly}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`
                  group relative bg-gray-50 rounded-lg p-4 border-2 transition-all duration-200
                  ${currentPlayingIndex === index ? 'border-green-400 bg-green-50' : 'border-gray-200'}
                  ${dragState.isDragging && index === dragState.dragIndex ? 'opacity-50' : ''}
                  ${dragState.isDragging && index === dragState.dropIndex ? 'border-blue-400 bg-blue-50' : ''}
                  ${!readOnly ? 'hover:border-gray-300 cursor-move' : ''}
                `}
              >
                {/* 拖拽指示器 */}
                {!readOnly && (
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                )}

                <div className="flex items-center justify-between ml-6">
                  {/* 音符信息 */}
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="text-lg font-bold text-gray-900 min-w-[60px]">
                      {note.name}{note.octave}
                    </div>

                    <div className="text-sm text-gray-600 min-w-[80px]">
                      {note.frequency.toFixed(1)}Hz
                    </div>

                    <div className="text-sm text-gray-600 min-w-[60px]">
                      {note.volume.toFixed(1)}dB
                    </div>

                    {/* 時長控制 */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">時長:</label>
                      <input
                        type="number"
                        min="100"
                        max="5000"
                        step="50"
                        value={note.duration}
                        onChange={(e) => updateNote(index, {
                          duration: parseInt(e.target.value) || 500
                        })}
                        className="w-20 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        readOnly={readOnly}
                      />
                      <span className="text-sm text-gray-500">ms</span>
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  {!readOnly && (
                    <div className="flex items-center space-x-2">
                      {/* 八度調整 */}
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => adjustNoteOctave(index, 'up')}
                          disabled={note.octave >= 8}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="提高八度"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => adjustNoteOctave(index, 'down')}
                          disabled={note.octave <= 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="降低八度"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* 刪除按鈕 */}
                      <button
                        onClick={() => removeNote(index)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="刪除音符"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* 序號指示器 */}
                <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};