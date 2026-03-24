// Playback Controls 播放控制組件

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pattern, Note } from '../../../types';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';
import { Button } from '../common/Button';

export interface PlaybackControlsProps {
  pattern?: Pattern;
  className?: string;
  onVolumeChange?: (volume: number) => void;
  onPlayingIndexChange?: (index: number) => void;
  disabled?: boolean;
}

interface PlaybackState {
  isPlaying: boolean;
  currentIndex: number;
  progress: number;
  elapsed: number;
  duration: number;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  pattern,
  className = '',
  onVolumeChange,
  onPlayingIndexChange,
  disabled = false
}) => {
  const { currentProfile, appCore } = useBuzzerApp();

  // 播放狀態
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentIndex: -1,
    progress: 0,
    elapsed: 0,
    duration: 0
  });

  // 音量控制
  const [masterVolume, setMasterVolume] = useState(30);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(30);

  // 播放模式
  const [loopMode, setLoopMode] = useState(false);
  const [randomMode, setRandomMode] = useState(false);

  // Refs for async playback control
  const isPlayingRef = useRef(false);
  const loopModeRef = useRef(false);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);

  // 計算總時長
  const totalDuration = pattern && pattern.notes && Array.isArray(pattern.notes) ?
    pattern.notes.reduce((sum, note) => sum + note.duration, 0) : 0;

  useEffect(() => {
    setPlaybackState(prev => ({ ...prev, duration: totalDuration }));
  }, [totalDuration]);

  // 音量變更處理
  useEffect(() => {
    if (appCore) {
      appCore.audioEngine.setMasterVolume(isMuted ? 0 : masterVolume / 100);
    }
    onVolumeChange?.(isMuted ? 0 : masterVolume);
  }, [masterVolume, isMuted, appCore, onVolumeChange]);

  // 通知父元件當前播放索引
  useEffect(() => {
    onPlayingIndexChange?.(playbackState.isPlaying ? playbackState.currentIndex : -1);
  }, [playbackState.currentIndex, playbackState.isPlaying, onPlayingIndexChange]);

  // 全局快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 不在 input/textarea 中時才觸發
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (playbackState.isPlaying) {
          pausePlayback();
        } else if (canPlay) {
          playPattern();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackState.isPlaying]);

  // 播放
  const playPattern = useCallback(async () => {
    if (!pattern || !currentProfile || !appCore || disabled) return;

    isPlayingRef.current = true;

    setPlaybackState(prev => ({
      ...prev,
      isPlaying: true,
      currentIndex: 0,
      elapsed: 0,
      progress: 0
    }));

    const playNotes = async (notes: Note[], startIndex = 0) => {
      let elapsed = 0;

      for (let i = startIndex; i < notes.length; i++) {
        if (!isPlayingRef.current) break;

        setPlaybackState(prev => ({
          ...prev,
          currentIndex: i,
          elapsed,
          progress: totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0
        }));

        const note = notes[i];
        await appCore.audioEngine.playNote(note, currentProfile);

        const stepDuration = note.duration;
        const stepSize = 50;
        const steps = Math.ceil(stepDuration / stepSize);

        for (let step = 0; step < steps; step++) {
          if (!isPlayingRef.current) break;

          await new Promise(resolve => {
            playbackTimerRef.current = setTimeout(resolve, stepSize);
          });

          elapsed += stepSize;
          setPlaybackState(prev => ({
            ...prev,
            elapsed,
            progress: totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0
          }));
        }
      }

      if (loopModeRef.current && isPlayingRef.current) {
        await playNotes(notes, 0);
      } else {
        isPlayingRef.current = false;
        setPlaybackState(prev => ({
          ...prev,
          isPlaying: false,
          currentIndex: -1,
          progress: 100
        }));
      }
    };

    const notesToPlay = randomMode ?
      [...(pattern.notes || [])].sort(() => Math.random() - 0.5) :
      (pattern.notes || []);

    await playNotes(notesToPlay);
  }, [pattern, currentProfile, appCore, disabled, totalDuration, randomMode]);

  // 停止播放
  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      currentIndex: -1,
      progress: 0,
      elapsed: 0
    }));

    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
    }
    appCore?.stopPlayback();
  }, [appCore]);

  // 暫停播放
  const pausePlayback = useCallback(() => {
    isPlayingRef.current = false;
    setPlaybackState(prev => ({ ...prev, isPlaying: false }));

    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
    }
    appCore?.stopPlayback();
  }, [appCore]);

  // 繼續播放
  const resumePlayback = useCallback(async () => {
    await playPattern();
  }, [playPattern]);

  // 音量控制
  const handleVolumeChange = useCallback((value: number) => {
    setMasterVolume(value);
    if (value > 0) {
      setIsMuted(false);
    }
  }, []);

  // 靜音切換
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (prev) {
        setMasterVolume(previousVolume);
        return false;
      } else {
        setPreviousVolume(masterVolume);
        return true;
      }
    });
  }, [masterVolume, previousVolume]);

  // 快進/快退
  const seekTo = useCallback((percentage: number) => {
    if (!pattern) return;

    const targetTime = (percentage / 100) * totalDuration;
    let accumulated = 0;
    let targetIndex = 0;
    const notes = pattern.notes || [];

    for (let i = 0; i < notes.length; i++) {
      accumulated += notes[i].duration;
      if (accumulated >= targetTime) {
        targetIndex = i;
        break;
      }
    }

    setPlaybackState(prev => ({
      ...prev,
      currentIndex: targetIndex,
      elapsed: targetTime,
      progress: percentage
    }));

    if (isPlayingRef.current) {
      playPattern();
    }
  }, [pattern, totalDuration, playPattern]);

  // 格式化時間
  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 清理
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
      }
    };
  }, []);

  const hasPattern = pattern && pattern.notes && Array.isArray(pattern.notes) && pattern.notes.length > 0;
  const canPlay = hasPattern && currentProfile && !disabled;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
      {/* 播放信息 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {pattern ? pattern.name : '未選擇模式'}
          </h3>
          <div className="text-xs text-gray-600 font-mono">
            {formatTime(playbackState.elapsed)} / {formatTime(totalDuration)}
          </div>
        </div>

        {/* 進度條 - 可見的 seekable 進度條 */}
        <div className="relative group">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="progress-bar h-full rounded-full"
              style={{ width: `${Math.min(playbackState.progress, 100)}%` }}
            />
          </div>
          <input
            type="range"
            min="0" max="100" step="0.1"
            value={playbackState.progress}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-2 appearance-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 slider"
            disabled={!canPlay}
            aria-label="播放進度"
            aria-valuenow={Math.round(playbackState.progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          {/* Hover 時顯示的 thumb 指示器 */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `calc(${Math.min(playbackState.progress, 100)}% - 6px)` }}
          />
        </div>

        {/* 當前播放音符 */}
        {playbackState.isPlaying && playbackState.currentIndex >= 0 && pattern?.notes?.[playbackState.currentIndex] && (
          <div className="mt-2 px-3 py-1.5 bg-blue-50 rounded-lg flex items-center justify-between text-xs">
            <span className="text-blue-800 font-medium">
              正在播放: {pattern.notes[playbackState.currentIndex].name}
              {pattern.notes[playbackState.currentIndex].octave}
              <span className="ml-1 text-blue-600">
                ({pattern.notes[playbackState.currentIndex].frequency.toFixed(0)}Hz)
              </span>
            </span>
            <span className="text-blue-600">
              {playbackState.currentIndex + 1} / {pattern.notes.length}
            </span>
          </div>
        )}
      </div>

      {/* 主要控制 */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <Button
          onClick={stopPlayback}
          variant="secondary"
          size="sm"
          disabled={!playbackState.isPlaying}
          aria-label="停止播放"
          icon={
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          }
        >
          停止
        </Button>

        <Button
          onClick={playbackState.isPlaying ? pausePlayback : resumePlayback}
          variant="primary"
          size="sm"
          disabled={!canPlay}
          className="px-6"
          aria-label={playbackState.isPlaying ? '暫停播放' : '開始播放'}
          icon={
            playbackState.isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )
          }
        >
          {playbackState.isPlaying ? '暫停' : '播放'}
        </Button>

        <Button
          onClick={() => playPattern()}
          variant="secondary"
          size="sm"
          disabled={!canPlay}
          aria-label="從頭重播"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        >
          重播
        </Button>
      </div>

      {/* 音量和模式 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 音量 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">音量</label>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label={isMuted ? '取消靜音' : '靜音'}
            >
              {isMuted || masterVolume === 0 ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            <input
              type="range" min="0" max="100"
              value={isMuted ? 0 : masterVolume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              aria-label="主音量"
              aria-valuenow={isMuted ? 0 : masterVolume}
              aria-valuemin={0}
              aria-valuemax={100}
            />

            <span className="text-xs text-gray-600 min-w-[2.5rem] text-right font-mono">
              {isMuted ? 0 : masterVolume}%
            </span>
          </div>
        </div>

        {/* 播放模式 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">模式</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLoopMode(!loopMode)}
              className={`p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1 ${
                loopMode ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
              aria-label={loopMode ? '關閉循環播放' : '開啟循環播放'}
              aria-pressed={loopMode}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              循環
            </button>

            <button
              onClick={() => setRandomMode(!randomMode)}
              className={`p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1 ${
                randomMode ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
              aria-label={randomMode ? '關閉隨機播放' : '開啟隨機播放'}
              aria-pressed={randomMode}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16l4-7 4 7V4H7z" />
              </svg>
              隨機
            </button>

            <span className="text-xs text-gray-600 ml-1">
              {!loopMode && !randomMode && '順序播放'}
            </span>
          </div>
        </div>
      </div>

      {/* 提示訊息 - 使用快捷鍵 */}
      {canPlay && (
        <div className="mt-3 text-center">
          <span className="text-[10px] text-gray-400">按空白鍵播放/暫停</span>
        </div>
      )}

      {/* 缺少前置條件提示 */}
      {!hasPattern && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-yellow-800">請先選擇或建立包含音符的模式</span>
          </div>
        </div>
      )}

      {hasPattern && !currentProfile && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-yellow-800">請先選擇 Buzzer Profile</span>
          </div>
        </div>
      )}
    </div>
  );
};
