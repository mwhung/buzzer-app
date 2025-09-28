// Filter 過濾器組件 - 控制音樂棋盤的顯示參數

import React, { useState, useEffect } from 'react';

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

  // 錯誤狀態管理
  const [errors, setErrors] = useState<{
    minFrequency?: string;
    maxFrequency?: string;
  }>({});

  // 臨時輸入值狀態 (允許空值和無效值)
  const [inputValues, setInputValues] = useState<{
    minFrequency: string;
    maxFrequency: string;
  }>({
    minFrequency: settings.minFrequency.toString(),
    maxFrequency: settings.maxFrequency.toString()
  });

  // 同步外部設定變更到內部狀態
  useEffect(() => {
    setInputValues({
      minFrequency: settings.minFrequency.toString(),
      maxFrequency: settings.maxFrequency.toString()
    });
  }, [settings.minFrequency, settings.maxFrequency]);

  // 頻率驗證函數
  const validateFrequency = (value: string, isMin: boolean = true): string | null => {
    // 允許空值
    if (value === '' || value === '0') {
      return null;
    }

    const num = parseFloat(value);

    // 檢查是否為有效數字
    if (isNaN(num)) {
      return '請輸入有效的數字';
    }

    // 檢查是否為負數
    if (num < 0) {
      return '頻率不能為負數';
    }

    // 檢查合理範圍 (蜂鳴器通常 20Hz - 20kHz)
    if (num > 0 && num < 20) {
      return '建議頻率至少為 20Hz';
    }

    if (num > 20000) {
      return '建議頻率不超過 20kHz';
    }

    // 檢查最小/最大頻率邏輯關係
    if (isMin) {
      const maxFreq = parseFloat(inputValues.maxFrequency);
      if (!isNaN(maxFreq) && num > maxFreq) {
        return '最低頻率不能大於最高頻率';
      }
    } else {
      const minFreq = parseFloat(inputValues.minFrequency);
      if (!isNaN(minFreq) && num < minFreq) {
        return '最高頻率不能小於最低頻率';
      }
    }

    return null;
  };

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

  // 處理頻率輸入變更
  const handleFrequencyChange = (value: string, field: 'minFrequency' | 'maxFrequency') => {
    // 更新臨時輸入值
    setInputValues(prev => ({
      ...prev,
      [field]: value
    }));

    // 清除該欄位的錯誤
    setErrors(prev => ({
      ...prev,
      [field]: undefined
    }));
  };

  // 處理欄位失焦驗證
  const handleFrequencyBlur = (field: 'minFrequency' | 'maxFrequency') => {
    const value = inputValues[field];
    const isMin = field === 'minFrequency';
    const error = validateFrequency(value, isMin);

    if (error) {
      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
    } else {
      // 驗證通過，更新實際設定
      const numValue = value === '' || value === '0' ? 0 : parseFloat(value);
      if (!isNaN(numValue)) {
        updateSetting(field, numValue);
      }
    }
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
              <div>
                <input
                  type="number"
                  value={inputValues.minFrequency}
                  onChange={(e) => handleFrequencyChange(e.target.value, 'minFrequency')}
                  onBlur={() => handleFrequencyBlur('minFrequency')}
                  placeholder="輸入頻率值 (Hz)"
                  className={`w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 ${
                    errors.minFrequency
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors.minFrequency && (
                  <div className="flex items-start mt-1">
                    <svg className="w-3 h-3 text-red-500 mt-0.5 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-red-600">{errors.minFrequency}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">最高頻率</label>
              <div>
                <input
                  type="number"
                  value={inputValues.maxFrequency}
                  onChange={(e) => handleFrequencyChange(e.target.value, 'maxFrequency')}
                  onBlur={() => handleFrequencyBlur('maxFrequency')}
                  placeholder="輸入頻率值 (Hz)"
                  className={`w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 ${
                    errors.maxFrequency
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors.maxFrequency && (
                  <div className="flex items-start mt-1">
                    <svg className="w-3 h-3 text-red-500 mt-0.5 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-red-600">{errors.maxFrequency}</span>
                  </div>
                )}
              </div>
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