// Pattern Editor 模式編輯器組件 - 重構版本

import React, { useState, useEffect, useRef } from 'react';
import { Pattern, Note } from '../../../types';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';
import { PatternMetadata } from './editor/PatternMetadata';
import { NoteEditor } from './editor/NoteEditor';
import { EditorPlaybackControls } from './editor/EditorPlaybackControls';

export interface PatternEditorProps {
  pattern?: Pattern;
  onPatternChange?: (pattern: Pattern) => void;
  onSave?: (pattern: Pattern) => void;
  className?: string;
  readOnly?: boolean;
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
      pattern: [],
      tempo: 120,
      version: '1.0',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    }
  );

  // 播放狀態
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(-1);

  // 引用
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isInitialMount = useRef(true);

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

  // 同步外部pattern變更（使用深度比較）
  useEffect(() => {
    if (pattern && !patternsEqual(pattern, editingPattern)) {
      setEditingPattern(pattern);
    }
  }, [pattern, editingPattern]);

  // 通知外部pattern變更 (避免在初始化時觸發)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onPatternChange?.(editingPattern);
  }, [editingPattern, onPatternChange]);

  // 清理effect
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 更新模式元數據
  const handlePatternMetadataChange = React.useCallback((updates: Partial<Pattern>) => {
    if (readOnly) return;

    setEditingPattern(prev => ({
      ...prev,
      ...updates,
      modifiedAt: new Date().toISOString()
    }));
  }, [readOnly]);

  // 添加音符
  const addNote = React.useCallback((note: Note) => {
    if (readOnly) return;

    const newNote: Note = {
      ...note
    };

    setEditingPattern(prev => ({
      ...prev,
      notes: [...(prev.notes || []), newNote],
      modifiedAt: new Date().toISOString()
    }));
  }, [readOnly]);

  // 更新音符列表
  const handleNotesChange = React.useCallback((notes: Note[]) => {
    if (readOnly) return;

    setEditingPattern(prev => ({
      ...prev,
      notes,
      modifiedAt: new Date().toISOString()
    }));
  }, [readOnly]);

  // 播放模式預覽
  const playPattern = React.useCallback(async () => {
    if (!appCore || !currentProfile || !editingPattern.notes || editingPattern.notes.length === 0) return;

    setIsPlaying(true);
    setCurrentPlayingIndex(0);

    try {
      for (let i = 0; i < editingPattern.notes.length; i++) {
        if (!isPlaying) break;

        setCurrentPlayingIndex(i);
        const note = editingPattern.notes[i];

        await appCore.audioEngine.playNote(note, currentProfile);

        // 等待音符時長
        await new Promise<void>(resolve => {
          timeoutRef.current = setTimeout(resolve, note.duration);
        });
      }
    } catch (error) {
      console.error('播放模式失敗:', error);
    } finally {
      setIsPlaying(false);
      setCurrentPlayingIndex(-1);
    }
  }, [appCore, currentProfile, editingPattern.notes, isPlaying]);

  // 停止播放
  const stopPattern = React.useCallback(() => {
    setIsPlaying(false);
    setCurrentPlayingIndex(-1);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    appCore?.stopPlayback();
  }, [appCore]);

  // 清空模式
  const clearPattern = React.useCallback(() => {
    if (readOnly) return;

    if (confirm('確定要清空所有音符嗎？此操作無法撤銷。')) {
      setEditingPattern(prev => ({
        ...prev,
        notes: [],
        modifiedAt: new Date().toISOString()
      }));
    }
  }, [readOnly]);

  // 保存模式
  const handleSave = React.useCallback(() => {
    onSave?.(editingPattern);
  }, [editingPattern, onSave]);

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;

      // 空格鍵: 播放/停止
      if (e.code === 'Space' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        if (isPlaying) {
          stopPattern();
        } else {
          playPattern();
        }
      }

      // Ctrl+S: 保存
      if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, isPlaying, stopPattern, playPattern, handleSave]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 模式元數據 */}
      <PatternMetadata
        pattern={editingPattern}
        onPatternChange={handlePatternMetadataChange}
        readOnly={readOnly}
      />

      {/* 播放控制 */}
      <EditorPlaybackControls
        pattern={editingPattern}
        isPlaying={isPlaying}
        currentPlayingIndex={currentPlayingIndex}
        onPlayStart={playPattern}
        onPlayStop={stopPattern}
        onClearPattern={clearPattern}
        onSavePattern={handleSave}
        readOnly={readOnly}
      />

      {/* 音符編輯器 */}
      <NoteEditor
        notes={editingPattern.notes || []}
        onNotesChange={handleNotesChange}
        onNoteAdd={addNote}
        readOnly={readOnly}
        currentPlayingIndex={currentPlayingIndex}
      />

      {/* 使用提示 */}
      {!readOnly && editingPattern.notes && editingPattern.notes.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <div className="text-blue-600 mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-blue-900 mb-2">開始創建您的音頻模式</h3>
          <p className="text-blue-700 mb-4">
            使用音樂棋盤選擇音符，或者從模式庫中導入現有模式開始編輯
          </p>
          <div className="text-sm text-blue-600">
            <div className="mb-1">💡 提示：您可以拖拽音符來重新排序</div>
            <div>🎵 使用空格鍵快速播放預覽</div>
          </div>
        </div>
      )}
    </div>
  );
};