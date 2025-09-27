// Note Editor 音符編輯組件

import React from 'react';
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

  // 移除音符
  const removeNote = React.useCallback((index: number) => {
    if (readOnly) return;

    const newNotes = notes.filter((_, i) => i !== index);
    onNotesChange(newNotes);
  }, [notes, onNotesChange, readOnly]);

  // 更新音符
  const updateNote = React.useCallback((index: number, updates: Partial<Note>) => {
    if (readOnly) return;

    const newNotes = notes.map((note, i) =>
      i === index ? { ...note, ...updates } : note
    );
    onNotesChange(newNotes);
  }, [notes, onNotesChange, readOnly]);

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

  // 渲染音符項目
  const renderNoteItem = React.useCallback((note: Note, index: number, dragProps: DragHandlers) => {
    const isPlaying = currentPlayingIndex === index;
    const { dragState } = dragProps;
    const isDraggedItem = dragState.isDragging && dragState.dragIndex === index;
    const isDropTarget = dragState.isDragging && dragState.dropIndex === index;

    return (
      <div
        key={`note-${index}`}
        draggable={!readOnly}
        onDragStart={(e) => dragProps.onDragStart(e, index)}
        onDragOver={(e) => dragProps.onDragOver(e, index)}
        onDrop={(e) => dragProps.onDrop(e, index)}
        onDragEnd={dragProps.onDragEnd}
        className={`
          bg-white border rounded p-3 transition-all duration-200 hover:shadow-sm
          ${isDraggedItem ? 'opacity-50 scale-95' : ''}
          ${isDropTarget ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
          ${isPlaying ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
          ${!readOnly ? 'cursor-move' : ''}
        `}
      >
        <div className="space-y-3">
          {/* 頂部：音符信息和主要控制 */}
          <div className="flex items-center justify-between">
            {/* 音符信息 */}
            <div className="flex items-center space-x-3">
              <div className="text-base font-bold text-gray-900">
                {note.name}{note.octave}
              </div>
              <div className="text-xs text-gray-500">
                {note.frequency.toFixed(1)}Hz
              </div>
              <div className="text-xs text-gray-500">
                {(note.spl || 0).toFixed(1)}dB
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
                  min="1"
                  max="10000"
                  value={note.duration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1 && value <= 10000) {
                      updateNote(index, { duration: value });
                    }
                  }}
                  className="flex-1 text-xs border border-gray-300 rounded px-1 py-1 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  readOnly={readOnly}
                />
                <button
                  onClick={() => adjustNoteDuration(index, 10)}
                  disabled={readOnly || note.duration >= 9990}
                  className="w-6 h-6 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded text-xs"
                  title="增加 10ms"
                >
                  +
                </button>
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
  }, [currentPlayingIndex, readOnly, adjustNoteOctave, adjustNoteDuration, updateNote, removeNote, playNotePreview]);

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
              {notes.map((note, index) => renderNoteItem(note, index, dragProps))}
            </div>
          )}
        </DragAndDrop>
      )}
    </div>
  );
};