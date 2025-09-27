// Editor Playback Controls 編輯器播放控制組件

import React from 'react';
import { Pattern } from '../../../../types';
import { useBuzzerApp } from '../../../../hooks/useBuzzerApp';
import { Button } from '../../common/Button';

export interface EditorPlaybackControlsProps {
  pattern: Pattern;
  isPlaying: boolean;
  currentPlayingIndex: number;
  onPlayStart: () => void;
  onPlayStop: () => void;
  onClearPattern: () => void;
  onSavePattern: () => void;
  readOnly?: boolean;
}

export const EditorPlaybackControls: React.FC<EditorPlaybackControlsProps> = ({
  pattern,
  isPlaying,
  currentPlayingIndex,
  onPlayStart,
  onPlayStop,
  onClearPattern,
  onSavePattern,
  readOnly = false
}) => {
  const { currentProfile } = useBuzzerApp();

  const canPlay = pattern.notes && pattern.notes.length > 0 && currentProfile && !isPlaying;
  const hasNotes = pattern.notes && pattern.notes.length > 0;

  // 計算播放進度
  const playProgress = React.useMemo(() => {
    if (!isPlaying || !hasNotes) return 0;
    return ((currentPlayingIndex + 1) / pattern.notes.length) * 100;
  }, [isPlaying, currentPlayingIndex, hasNotes, pattern.notes]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">播放控制</h3>

        {/* 播放狀態指示 */}
        {isPlaying && (
          <div className="flex items-center text-sm text-blue-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-2"></div>
            播放中 ({currentPlayingIndex + 1}/{pattern.notes?.length || 0})
          </div>
        )}
      </div>

      {/* 播放進度條 */}
      {isPlaying && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${playProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>進度: {playProgress.toFixed(1)}%</span>
            <span>剩餘: {pattern.notes?.length - currentPlayingIndex - 1 || 0} 音符</span>
          </div>
        </div>
      )}

      {/* 主要控制按鈕 */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <Button
          onClick={onPlayStop}
          variant="secondary"
          size="lg"
          disabled={!isPlaying}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          }
        >
          停止
        </Button>

        <Button
          onClick={onPlayStart}
          variant="primary"
          size="lg"
          disabled={!canPlay}
          className="px-8"
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          }
        >
          播放預覽
        </Button>
      </div>

      {/* 次要操作按鈕 */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={onClearPattern}
          variant="secondary"
          disabled={!hasNotes || readOnly}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
        >
          清空模式
        </Button>

        <Button
          onClick={onSavePattern}
          variant="primary"
          disabled={readOnly}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          }
        >
          保存模式
        </Button>
      </div>

      {/* 狀態提示 */}
      <div className="mt-4 space-y-2">
        {!hasNotes && (
          <div className="text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              請先添加音符才能播放
            </div>
          </div>
        )}

        {hasNotes && !currentProfile && (
          <div className="text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              請先選擇 Buzzer Profile 才能播放
            </div>
          </div>
        )}

        {readOnly && (
          <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              當前為只讀模式，無法編輯
            </div>
          </div>
        )}
      </div>

      {/* 快捷鍵提示 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">快捷操作</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>空格鍵: 播放/停止</div>
          <div>Ctrl+S: 保存模式</div>
          <div>Delete: 刪除選中音符</div>
          <div>拖拽: 重新排序音符</div>
        </div>
      </div>
    </div>
  );
};