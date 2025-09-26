// Playback Controls 播放控制組件

import React, { useState, useEffect, useRef } from 'react';
import { Pattern } from '../../../types';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';
import { Button } from '../common/Button';

export interface PlaybackControlsProps {
  pattern?: Pattern;
  className?: string;
  onVolumeChange?: (volume: number) => void;
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

  // 引用
  const playbackTimerRef = useRef<NodeJS.Timeout>();
  const progressTimerRef = useRef<NodeJS.Timeout>();

  // 計算總時長
  const totalDuration = pattern ?
    pattern.notes.reduce((sum, note) => sum + note.duration, 0) : 0;

  // 更新播放狀態
  useEffect(() => {
    setPlaybackState(prev => ({
      ...prev,
      duration: totalDuration
    }));
  }, [totalDuration]);

  // 音量變更處理
  useEffect(() => {
    if (appCore) {
      appCore.audioEngine.setMasterVolume(isMuted ? 0 : masterVolume / 100);
    }
    onVolumeChange?.(isMuted ? 0 : masterVolume);
  }, [masterVolume, isMuted, appCore, onVolumeChange]);

  // 播放模式
  const playPattern = async () => {
    if (!pattern || !currentProfile || !appCore || disabled) return;

    setPlaybackState(prev => ({
      ...prev,
      isPlaying: true,
      currentIndex: 0,
      elapsed: 0,
      progress: 0
    }));

    const playNotes = async (notes: typeof pattern.notes, startIndex = 0) => {
      let elapsed = 0;

      for (let i = startIndex; i < notes.length; i++) {
        if (!playbackState.isPlaying && playbackState.currentIndex === -1) {
          break; // 被手動停止
        }

        setPlaybackState(prev => ({
          ...prev,
          currentIndex: i,
          elapsed,
          progress: (elapsed / totalDuration) * 100
        }));

        const note = notes[i];
        await appCore.audioEngine.playNote(note, currentProfile);

        // 等待音符時長，同時更新進度
        const stepDuration = note.duration;
        const stepSize = 50; // 50ms 更新一次
        const steps = Math.ceil(stepDuration / stepSize);

        for (let step = 0; step < steps; step++) {
          if (!playbackState.isPlaying) break;

          await new Promise(resolve => {
            playbackTimerRef.current = setTimeout(resolve, stepSize);
          });

          elapsed += stepSize;
          setPlaybackState(prev => ({
            ...prev,
            elapsed,
            progress: (elapsed / totalDuration) * 100
          }));
        }
      }

      // 播放完成
      if (loopMode && playbackState.isPlaying) {
        // 循環播放
        await playNotes(notes, 0);
      } else {
        setPlaybackState(prev => ({
          ...prev,
          isPlaying: false,
          currentIndex: -1,
          progress: 100
        }));
      }
    };

    const notesToPlay = randomMode ?
      [...pattern.notes].sort(() => Math.random() - 0.5) :
      pattern.notes;

    await playNotes(notesToPlay);
  };

  // 停止播放
  const stopPlayback = () => {
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
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
    }

    appCore?.stopPlayback();
  };

  // 暫停播放
  const pausePlayback = () => {
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false
    }));

    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
    }

    appCore?.stopPlayback();
  };

  // 繼續播放
  const resumePlayback = async () => {
    if (!pattern || playbackState.currentIndex === -1) {
      await playPattern();
      return;
    }

    setPlaybackState(prev => ({
      ...prev,
      isPlaying: true
    }));

    // 從當前位置繼續播放
    // 這裡簡化處理，重新開始播放
    await playPattern();
  };

  // 音量控制
  const handleVolumeChange = (value: number) => {
    setMasterVolume(value);
    if (isMuted && value > 0) {
      setIsMuted(false);
    }
  };

  // 靜音切換
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setMasterVolume(previousVolume);
    } else {
      setPreviousVolume(masterVolume);
      setIsMuted(true);
    }
  };

  // 快進/快退（跳到指定位置）
  const seekTo = (percentage: number) => {
    if (!pattern) return;

    const targetTime = (percentage / 100) * totalDuration;
    let accumulated = 0;
    let targetIndex = 0;

    for (let i = 0; i < pattern.notes.length; i++) {
      accumulated += pattern.notes[i].duration;
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

    if (playbackState.isPlaying) {
      // 如果正在播放，從新位置繼續
      playPattern();
    }
  };

  // 格式化時間顯示
  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 清理定時器
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
      }
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
    };
  }, []);

  const hasPattern = pattern && pattern.notes.length > 0;
  const canPlay = hasPattern && currentProfile && !disabled;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      {/* 播放信息顯示 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {pattern ? pattern.name : '未選擇模式'}
          </h3>
          <div className="text-sm text-gray-500">
            {formatTime(playbackState.elapsed)} / {formatTime(totalDuration)}
          </div>
        </div>

        {/* 進度條 */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${playbackState.progress}%` }}
            />
          </div>

          {/* 可點擊的進度條 */}
          <input
            type="range"
            min="0"
            max="100"
            value={playbackState.progress}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
            disabled={!canPlay}
          />
        </div>

        {/* 當前播放音符信息 */}
        {playbackState.isPlaying && playbackState.currentIndex >= 0 && pattern && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-900">
                正在播放: {pattern.notes[playbackState.currentIndex].name}
                {pattern.notes[playbackState.currentIndex].octave}
              </span>
              <span className="text-blue-700">
                {playbackState.currentIndex + 1} / {pattern.notes.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 主要控制按鈕 */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <Button
          onClick={stopPlayback}
          variant="secondary"
          size="lg"
          disabled={!playbackState.isPlaying}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          }
        >
          停止
        </Button>

        <Button
          onClick={playbackState.isPlaying ? pausePlayback : resumePlayback}
          variant="primary"
          size="lg"
          disabled={!canPlay}
          className="px-8"
          icon={
            playbackState.isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
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
          size="lg"
          disabled={!canPlay}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        >
          重播
        </Button>
      </div>

      {/* 音量和模式控制 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 音量控制 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            音量控制
          </label>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleMute}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title={isMuted ? '取消靜音' : '靜音'}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : masterVolume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />

            <span className="text-sm text-gray-600 min-w-[3rem] text-right">
              {isMuted ? 0 : masterVolume}%
            </span>
          </div>
        </div>

        {/* 播放模式 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            播放模式
          </label>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setLoopMode(!loopMode)}
              className={`p-2 rounded-lg transition-all ${
                loopMode
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } border`}
              title={loopMode ? '取消循環' : '循環播放'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={() => setRandomMode(!randomMode)}
              className={`p-2 rounded-lg transition-all ${
                randomMode
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } border`}
              title={randomMode ? '取消隨機' : '隨機播放'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16l4-7 4 7V4H7z" />
              </svg>
            </button>

            <div className="text-xs text-gray-500">
              {loopMode && '循環'}
              {loopMode && randomMode && ' | '}
              {randomMode && '隨機'}
              {!loopMode && !randomMode && '順序播放'}
            </div>
          </div>
        </div>
      </div>

      {/* 狀態信息 */}
      {!hasPattern && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-yellow-800">請先選擇一個音頻模式</span>
          </div>
        </div>
      )}

      {hasPattern && !currentProfile && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-yellow-800">請先選擇Buzzer Profile</span>
          </div>
        </div>
      )}
    </div>
  );
};