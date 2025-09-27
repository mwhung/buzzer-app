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
  const { currentProfile, appCore } = useBuzzerApp();

  // Master Volume 狀態
  const [masterVolume, setMasterVolume] = React.useState(75);

  const canPlay = pattern.notes && pattern.notes.length > 0 && currentProfile && !isPlaying;
  const hasNotes = pattern.notes && pattern.notes.length > 0;

  // 計算播放進度
  const playProgress = React.useMemo(() => {
    if (!isPlaying || !hasNotes) return 0;
    return ((currentPlayingIndex + 1) / pattern.notes.length) * 100;
  }, [isPlaying, currentPlayingIndex, hasNotes, pattern.notes]);

  // 處理master volume變更
  const handleMasterVolumeChange = React.useCallback((volume: number) => {
    setMasterVolume(volume);
    // 這裡可以設置到全局音頻引擎或appCore中
    if (appCore) {
      // appCore.audioEngine.setMasterVolume(volume / 100);
    }
  }, [appCore]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-full">
      <h3 className="text-base font-semibold text-gray-900 mb-3">播放控制</h3>

      {/* 播放狀態 */}
      {isPlaying && (
        <div className="mb-3">
          <div className="flex items-center text-xs text-blue-600 mb-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse mr-1"></div>
            播放中 {currentPlayingIndex + 1}/{pattern.notes?.length || 0}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${playProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Master Volume Control */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">
          主音量 {masterVolume}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={masterVolume}
          onChange={(e) => handleMasterVolumeChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* 主要控制按鈕 */}
      <div className="space-y-3 mb-4">
        <button
          onClick={isPlaying ? onPlayStop : onPlayStart}
          disabled={!hasNotes || !currentProfile}
          className={`
            w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg font-medium text-sm transition-colors
            ${(!hasNotes || !currentProfile)
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : isPlaying
                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          `}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            {isPlaying ? (
              <rect x="4" y="4" width="16" height="16" rx="2" />
            ) : (
              <polygon points="5,3 19,12 5,21" />
            )}
          </svg>
          <span>{isPlaying ? '停止' : '播放'}</span>
        </button>
      </div>

      {/* 次要操作 */}
      <div className="space-y-2 mb-4">
        <button
          onClick={() => {
            console.log('保存按鈕被點擊');
            onSavePattern();
          }}
          disabled={readOnly}
          className="w-full flex items-center justify-center space-x-2 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>保存</span>
        </button>

        <button
          onClick={onClearPattern}
          disabled={!hasNotes || readOnly}
          className="w-full flex items-center justify-center space-x-2 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>清空</span>
        </button>
      </div>

      {/* 狀態提示 */}
      {!hasNotes && (
        <div className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
          請先添加音符
        </div>
      )}

      {hasNotes && !currentProfile && (
        <div className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
          請選擇 Profile
        </div>
      )}

      {readOnly && (
        <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2 mb-3">
          只讀模式
        </div>
      )}

      {/* 快捷鍵 */}
      <div className="pt-3 border-t border-gray-100">
        <h4 className="text-xs font-medium text-gray-900 mb-1">快捷鍵</h4>
        <div className="text-xs text-gray-500 space-y-0.5">
          <div>空格: 播放/停止</div>
          <div>Ctrl+S: 保存</div>
        </div>
      </div>
    </div>
  );
};