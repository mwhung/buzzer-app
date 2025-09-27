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
          bg-white border rounded-lg p-4 transition-all duration-200 hover:shadow-md
          ${isDraggedItem ? 'opacity-50 scale-95' : ''}
          ${isDropTarget ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
          ${isPlaying ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
          ${!readOnly ? 'cursor-move' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          {/* 音符信息 */}
          <div className="flex items-center space-x-4">
            <div className="text-lg font-bold text-gray-900">
              {note.name}{note.octave}
            </div>
            <div className="text-sm text-gray-500">
              {note.frequency.toFixed(1)}Hz
            </div>
            <div className="text-sm text-gray-500">
              {(note.spl || 0).toFixed(1)}dB
            </div>
          </div>

          {/* 控制按鈕 */}
          <div className="flex items-center space-x-3">
            {/* 八度調整 */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs text-gray-500 text-center">八度</label>
              <div className="flex flex-col space-y-1">
                <Button
                  onClick={() => adjustNoteOctave(index, 'up')}
                  variant="secondary"
                  size="sm"
                  disabled={readOnly || note.octave >= 8}
                  className="px-2 py-1 text-xs"
                >
                  ↑
                </Button>
                <Button
                  onClick={() => adjustNoteOctave(index, 'down')}
                  variant="secondary"
                  size="sm"
                  disabled={readOnly || note.octave <= 0}
                  className="px-2 py-1 text-xs"
                >
                  ↓
                </Button>
              </div>
            </div>

            {/* 時長控制 - 改進版 */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs text-gray-500 text-center">時長(ms)</label>
              <div className="flex items-center space-x-1">
                {/* 精確按鈕調整 */}
                <div className="flex flex-col space-y-1">
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => adjustNoteDuration(index, -1)}
                      variant="secondary"
                      size="sm"
                      disabled={readOnly || note.duration <= 1}
                      className="px-1 py-1 text-xs w-6 h-6 flex items-center justify-center"
                      title="減少 1ms"
                    >
                      -1
                    </Button>
                    <Button
                      onClick={() => adjustNoteDuration(index, -10)}
                      variant="secondary"
                      size="sm"
                      disabled={readOnly || note.duration <= 10}
                      className="px-1 py-1 text-xs w-8 h-6 flex items-center justify-center"
                      title="減少 10ms"
                    >
                      -10
                    </Button>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => adjustNoteDuration(index, 1)}
                      variant="secondary"
                      size="sm"
                      disabled={readOnly || note.duration >= 10000}
                      className="px-1 py-1 text-xs w-6 h-6 flex items-center justify-center"
                      title="增加 1ms"
                    >
                      +1
                    </Button>
                    <Button
                      onClick={() => adjustNoteDuration(index, 10)}
                      variant="secondary"
                      size="sm"
                      disabled={readOnly || note.duration >= 9990}
                      className="px-1 py-1 text-xs w-8 h-6 flex items-center justify-center"
                      title="增加 10ms"
                    >
                      +10
                    </Button>
                  </div>
                </div>

                {/* 直接輸入框 */}
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={note.duration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1 && value <= 10000) {
                      updateNote(index, { duration: value });
                    }
                  }}
                  className="w-20 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  readOnly={readOnly}
                  placeholder="1-10000"
                />
              </div>
            </div>

            {/* 音量控制 */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs text-gray-500 text-center">音量</label>
              <div className="flex items-center space-x-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={note.volume || 50}
                  onChange={(e) => updateNote(index, { volume: parseInt(e.target.value) })}
                  className="w-16"
                  disabled={readOnly}
                />
                <span className="text-xs text-gray-500 w-8">
                  {note.volume || 50}%
                </span>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex flex-col space-y-1">
              <Button
                onClick={() => playNotePreview(note)}
                variant="secondary"
                size="sm"
                icon={
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                }
              >
                試聽
              </Button>

              <Button
                onClick={() => removeNote(index)}
                variant="secondary"
                size="sm"
                disabled={readOnly}
                className="text-red-600 hover:bg-red-50"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }
              >
                移除
              </Button>
            </div>
          </div>
        </div>

        {/* 播放指示器 */}
        {isPlaying && (
          <div className="mt-3 p-2 bg-blue-100 rounded flex items-center text-sm text-blue-900">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-2"></div>
            正在播放此音符...
          </div>
        )}
      </div>
    );
  }, [currentPlayingIndex, readOnly, adjustNoteOctave, adjustNoteDuration, updateNote, removeNote, playNotePreview]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        音符編輯器 ({notes.length} 個音符)
      </h3>

      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p>還沒有添加任何音符</p>
          <p className="text-sm">從音樂棋盤中選擇音符來開始編輯</p>
        </div>
      ) : (
        <DragAndDrop
          notes={notes}
          onReorderNotes={handleReorderNotes}
          readOnly={readOnly}
        >
          {(dragProps) => (
            <div className="space-y-3">
              {notes.map((note, index) => renderNoteItem(note, index, dragProps))}
            </div>
          )}
        </DragAndDrop>
      )}
    </div>
  );
};