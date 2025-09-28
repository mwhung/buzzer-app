// Note Editor 音符編輯組件

import React, { useState, useEffect } from 'react';
import { Note, Buzzer } from '../../../../types';
import { MusicTheory } from '../../../../modules/music/MusicTheory';
import { useBuzzerApp } from '../../../../hooks/useBuzzerApp';
import { Button } from '../../common/Button';
import { DragAndDrop, DragHandlers } from './DragAndDrop';

export interface NoteEditorProps {
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
  onNoteAdd: (note: Note) => void;
  readOnly?: boolean;
  currentPlayingIndex?: number;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  notes,
  onNotesChange,
  onNoteAdd,
  readOnly = false,
  currentPlayingIndex = -1
}) => {
  const { currentProfile, appCore } = useBuzzerApp();

  // 簡化的錯誤和輸入狀態管理
  const [durationErrors, setDurationErrors] = useState<{[index: number]: string}>({});
  const [durationInputs, setDurationInputs] = useState<{[index: number]: string}>({});

  // 同步外部 notes 變化到內部狀態
  useEffect(() => {
    // 當 notes 數組變化時，清理不存在的索引並重置狀態
    setDurationInputs(prev => {
      const newInputs: {[index: number]: string} = {};
      notes.forEach((note, index) => {
        // 保留已存在的輸入值，或使用音符的當前時長
        newInputs[index] = prev[index] ?? String(note.duration);
      });
      return newInputs;
    });

    // 清理錯誤狀態中不存在的索引
    setDurationErrors(prev => {
      const newErrors: {[index: number]: string} = {};
      Object.keys(prev).forEach(key => {
        const index = parseInt(key);
        if (index < notes.length) {
          newErrors[index] = prev[index];
        }
      });
      return newErrors;
    });
  }, [notes]);

  // Duration驗證函數
  const validateDuration = (value: string): string | null => {
    // 允許空值
    if (value === '') {
      return null;
    }

    const num = parseFloat(value);

    // 檢查是否為有效數字
    if (isNaN(num)) {
      return '請輸入有效的數字';
    }

    // 檢查是否為負數
    if (num < 0) {
      return '時長不能為負數';
    }

    // 只提供建議，不阻止保存
    // 檢查合理範圍 (音符時長通常 10ms - 5000ms)
    if (num > 0 && num < 1) {
      return '建議時長至少為 1ms';
    }

    if (num > 10000) {
      return '建議時長不超過 10000ms';
    }

    return null;
  };

  // 處理Duration輸入變更 - 簡化版本
  const handleDurationChange = (value: string, noteIndex: number) => {
    setDurationInputs(prev => ({
      ...prev,
      [noteIndex]: value
    }));

    // 清除該欄位的錯誤
    if (durationErrors[noteIndex]) {
      setDurationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[noteIndex];
        return newErrors;
      });
    }
  };

  // 更新音符 - 移到前面避免變數提升問題
  const updateNote = React.useCallback((index: number, updates: Partial<Note>) => {
    if (readOnly) return;

    const newNotes = notes.map((note, i) =>
      i === index ? { ...note, ...updates } : note
    );
    onNotesChange(newNotes);
  }, [notes, onNotesChange, readOnly]);

  // 移除音符
  const removeNote = React.useCallback((index: number) => {
    if (readOnly) return;

    const newNotes = notes.filter((_, i) => i !== index);
    onNotesChange(newNotes);
  }, [notes, onNotesChange, readOnly]);

  // 重置特定音符的輸入狀態
  const resetNoteInputState = React.useCallback((noteIndex: number) => {
    setDurationInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[noteIndex];
      return newInputs;
    });
    setDurationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[noteIndex];
      return newErrors;
    });
  }, []);

  // 處理Duration欄位失焦驗證 - 改進版本
  const handleDurationBlur = React.useCallback((noteIndex: number) => {
    const value = durationInputs[noteIndex] || '';
    const error = validateDuration(value);

    if (error) {
      setDurationErrors(prev => ({
        ...prev,
        [noteIndex]: error
      }));
    } else {
      // 清除錯誤狀態
      setDurationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[noteIndex];
        return newErrors;
      });

      // 驗證通過，更新實際音符
      if (value === '') {
        // 空值時恢復原值
        setDurationInputs(prev => ({
          ...prev,
          [noteIndex]: String(notes[noteIndex]?.duration || 100)
        }));
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
          updateNote(noteIndex, { duration: numValue });
          // 成功更新後，清除輸入狀態讓它使用新的 notes 值
          setTimeout(() => {
            setDurationInputs(prev => {
              const newInputs = { ...prev };
              delete newInputs[noteIndex];
              return newInputs;
            });
          }, 0);
        }
      }
    }
  }, [durationInputs, notes, updateNote, validateDuration]);

  // 調整音符八度
  const adjustNoteOctave = React.useCallback((index: number, direction: 'up' | 'down') => {
    if (readOnly || !currentProfile || !appCore) return;

    const note = notes[index];
    const newOctave = direction === 'up' ? note.octave + 1 : note.octave - 1;

    if (newOctave < 0 || newOctave > 8) return;

    const newFrequency = MusicTheory.noteToFrequency(note.name, newOctave);
    const newSPL = appCore.audioEngine.calculateVolume(newFrequency, currentProfile);

    updateNote(index, {
      octave: newOctave,
      frequency: newFrequency,
      spl: newSPL
    });
  }, [notes, currentProfile, appCore, updateNote, readOnly]);

  // 調整音符時長 - 新增精確控制
  const adjustNoteDuration = React.useCallback((index: number, change: number) => {
    if (readOnly) return;

    const note = notes[index];
    const newDuration = Math.max(1, Math.min(10000, note.duration + change));
    updateNote(index, { duration: newDuration });
  }, [notes, updateNote, readOnly]);

  // 播放單個音符預覽
  const playNotePreview = React.useCallback(async (note: Note) => {
    if (!appCore || !currentProfile) return;

    try {
      await appCore.audioEngine.playNote(note, currentProfile);
    } catch (error) {
      console.error('播放音符預覽失敗:', error);
    }
  }, [appCore, currentProfile]);

  // 處理音符重排
  const handleReorderNotes = React.useCallback((newNotes: Note[]) => {
    onNotesChange(newNotes);
  }, [onNotesChange]);

  // 生成穩定的音符 key
  const getNoteKey = React.useCallback((note: Note, index: number) => {
    // 使用音符的唯一特性組合作為穩定的 key，避免使用 index
    return `${note.name}-${note.octave}-${note.frequency}-${index}`;
  }, []);

  // 渲染音符項目
  const renderNoteItem = React.useCallback((note: Note, index: number, dragProps: DragHandlers) => {
    const isPlaying = currentPlayingIndex === index;
    const { dragState } = dragProps;
    const isDraggedItem = dragState.isDragging && dragState.dragIndex === index;
    const isDropTarget = dragState.isDragging && dragState.dropIndex === index;

    return (
      <div
        key={getNoteKey(note, index)}
        onDragOver={(e) => dragProps.onDragOver(e, index)}
        onDrop={(e) => dragProps.onDrop(e, index)}
        onDragEnd={dragProps.onDragEnd}
        className={`
          bg-white border rounded p-3 transition-all duration-200 hover:shadow-sm
          ${isDraggedItem ? 'opacity-50 scale-95' : ''}
          ${isDropTarget ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
          ${isPlaying ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
        `}
      >
        <div className="space-y-3">
          {/* 頂部：音符信息和主要控制 */}
          <div className="flex items-center justify-between">
            {/* 左側：拖曳手柄 + 音符信息 */}
            <div className="flex items-center space-x-3">
              {/* 拖曳手柄 - 僅在左上角 */}
              {!readOnly && (
                <div
                  draggable={true}
                  onDragStart={(e) => dragProps.onDragStart(e, index)}
                  className="cursor-move p-1 hover:bg-gray-100 rounded transition-colors"
                  title="拖曳以重新排序"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                  </svg>
                </div>
              )}

              {/* 音符信息 */}
              <div>
                <div className="text-base font-bold text-gray-900">
                  {note.name}{note.octave}
                </div>
                <div className="text-xs text-gray-500 space-x-2">
                  <span>{note.frequency.toFixed(1)}Hz</span>
                  <span>•</span>
                  <span>{(note.spl || 0).toFixed(1)}dB</span>
                </div>
              </div>
            </div>

            {/* 主要操作 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => playNotePreview(note)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                title="試聽"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </button>
              <button
                onClick={() => removeNote(index)}
                disabled={readOnly}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                title="移除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 底部：編輯控制 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* 八度調整 */}
            <div>
              <label className="block text-gray-500 mb-1">八度</label>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => adjustNoteOctave(index, 'down')}
                  disabled={readOnly || note.octave <= 0}
                  className="w-6 h-6 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded text-xs"
                >
                  ↓
                </button>
                <span className="text-center font-medium min-w-[20px]">{note.octave}</span>
                <button
                  onClick={() => adjustNoteOctave(index, 'up')}
                  disabled={readOnly || note.octave >= 8}
                  className="w-6 h-6 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded text-xs"
                >
                  ↑
                </button>
              </div>
            </div>

            {/* 時長控制 */}
            <div>
              <label className="block text-gray-500 mb-1">時長(ms)</label>
              <div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => adjustNoteDuration(index, -10)}
                    disabled={readOnly || note.duration <= 10}
                    className="w-6 h-6 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded text-xs"
                    title="減少 10ms"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={durationInputs[index] ?? String(note.duration)}
                    onChange={(e) => handleDurationChange(e.target.value, index)}
                    onBlur={() => handleDurationBlur(index)}
                    placeholder="輸入時長 (ms)"
                    className={`flex-1 text-xs border rounded px-2 py-1 text-center focus:outline-none focus:ring-1 ${
                      durationErrors[index]
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    readOnly={readOnly}
                  />
                  <button
                    onClick={() => adjustNoteDuration(index, 10)}
                    disabled={readOnly || note.duration >= 5000}
                    className="w-6 h-6 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded text-xs"
                    title="增加 10ms"
                  >
                    +
                  </button>
                </div>
                {durationErrors[index] && (
                  <div className="flex items-start mt-1">
                    <svg className="w-3 h-3 text-red-500 mt-0.5 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-red-600">{durationErrors[index]}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 播放指示器 */}
        {isPlaying && (
          <div className="mt-2 p-2 bg-blue-100 rounded flex items-center text-xs text-blue-900">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse mr-2"></div>
            正在播放...
          </div>
        )}
      </div>
    );
  }, [currentPlayingIndex, readOnly, adjustNoteOctave, adjustNoteDuration, updateNote, removeNote, playNotePreview, durationInputs, durationErrors, handleDurationChange, handleDurationBlur, getNoteKey]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          音符編輯器
        </h3>
        <span className="text-xs text-gray-500">
          {notes.length} 個音符
        </span>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-sm">還沒有添加任何音符</p>
          <p className="text-xs text-gray-400">從音樂棋盤中選擇音符來開始編輯</p>
        </div>
      ) : (
        <DragAndDrop
          notes={notes}
          onReorderNotes={handleReorderNotes}
          readOnly={readOnly}
        >
          {(dragProps) => (
            <div className="space-y-2">
              {notes.map((note, index) => (
                <div key={getNoteKey(note, index)}>
                  {renderNoteItem(note, index, dragProps)}
                </div>
              ))}
            </div>
          )}
        </DragAndDrop>
      )}
    </div>
  );
};