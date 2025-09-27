// Filter 過濾器組件 - 控制音樂棋盤的顯示參數

import React from 'react';

// 調性定義
const KEY_SIGNATURES = [
  { value: 'C', label: 'C 大調', notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  { value: 'G', label: 'G 大調', notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] },
  { value: 'D', label: 'D 大調', notes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] },
  { value: 'A', label: 'A 大調', notes: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
  { value: 'E', label: 'E 大調', notes: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'] },
  { value: 'B', label: 'B 大調', notes: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },
  { value: 'F#', label: 'F# 大調', notes: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'] },
  { value: 'F', label: 'F 大調', notes: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'] },
  { value: 'Bb', label: 'Bb 大調', notes: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'] },
  { value: 'Eb', label: 'Eb 大調', notes: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'] },
  { value: 'Ab', label: 'Ab 大調', notes: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'] },
  { value: 'Db', label: 'Db 大調', notes: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'] }
];

export interface FilterSettings {
  minFrequency: number;
  maxFrequency: number;
  volumeHighlightEnabled: boolean;
  volumeThreshold: number;
  keySignature: string;
}

export interface FilterProps {
  settings: FilterSettings;
  onSettingsChange: (settings: FilterSettings) => void;
  className?: string;
}

export const Filter: React.FC<FilterProps> = ({
  settings,
  onSettingsChange,
  className = ''
}) => {

  // 更新設定的通用函數
  const updateSetting = <K extends keyof FilterSettings>(
    key: K,
    value: FilterSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <h3 className="text-base font-semibold text-gray-900 mb-4">過濾器</h3>

      <div className="space-y-4">
        {/* 頻率範圍設定 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            頻率範圍 (Hz)
          </label>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">最低頻率</label>
              <input
                type="number"
                min="20"
                max="20000"
                step="10"
                value={settings.minFrequency}
                onChange={(e) => updateSetting('minFrequency', parseInt(e.target.value) || 20)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">最高頻率</label>
              <input
                type="number"
                min="20"
                max="20000"
                step="10"
                value={settings.maxFrequency}
                onChange={(e) => updateSetting('maxFrequency', parseInt(e.target.value) || 20000)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 音量 Highlight 設定 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">
              音量 Highlight
            </label>
            <button
              onClick={() => updateSetting('volumeHighlightEnabled', !settings.volumeHighlightEnabled)}
              className={`
                relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                ${settings.volumeHighlightEnabled ? 'bg-blue-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-3 w-3 transform rounded-full bg-white transition-transform
                  ${settings.volumeHighlightEnabled ? 'translate-x-5' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {settings.volumeHighlightEnabled && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                音量門檻 ({settings.volumeThreshold} dB)
              </label>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={settings.volumeThreshold}
                onChange={(e) => updateSetting('volumeThreshold', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* 調性選擇 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            調性
          </label>
          <select
            value={settings.keySignature}
            onChange={(e) => updateSetting('keySignature', e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {KEY_SIGNATURES.map((key) => (
              <option key={key.value} value={key.value}>
                {key.label}
              </option>
            ))}
          </select>
        </div>

        {/* 當前設定摘要 */}
        <div className="pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 space-y-1">
            <div>範圍: {settings.minFrequency}-{settings.maxFrequency} Hz</div>
            <div>
              Highlight: {settings.volumeHighlightEnabled ? `>${settings.volumeThreshold}dB` : '關閉'}
            </div>
            <div>
              調性: {KEY_SIGNATURES.find(k => k.value === settings.keySignature)?.label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 獲取調性的音符排列
export const getKeySignatureNotes = (keySignature: string): string[] => {
  const key = KEY_SIGNATURES.find(k => k.value === keySignature);
  return key ? key.notes : KEY_SIGNATURES[0].notes; // 預設為 C 大調
};

// 預設設定
export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  minFrequency: 100,
  maxFrequency: 5000,
  volumeHighlightEnabled: false,
  volumeThreshold: 60,
  keySignature: 'C'
};