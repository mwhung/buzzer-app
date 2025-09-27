// Note Filters 音符過濾器組件

import React from 'react';

export interface FilterOptions {
  octaveRange: [number, number];
  volumeThreshold: number;
  showOnlyHighVolume: boolean;
  highlightBestFrequencies: boolean;
}

export interface FrequencyRange {
  min: number;
  max: number;
}

export interface NoteFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  frequencyRange: FrequencyRange;
  availableNotesCount: number;
  selectedNotesCount: number;
}

export const NoteFilters: React.FC<NoteFiltersProps> = ({
  filters,
  onFiltersChange,
  frequencyRange,
  availableNotesCount,
  selectedNotesCount
}) => {
  // 更新過濾器
  const updateFilters = React.useCallback((updates: Partial<FilterOptions>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  // 更新八度範圍下限
  const handleOctaveMinChange = React.useCallback((value: number) => {
    const newMin = Math.min(value, filters.octaveRange[1]);
    updateFilters({ octaveRange: [newMin, filters.octaveRange[1]] });
  }, [filters.octaveRange, updateFilters]);

  // 更新八度範圍上限
  const handleOctaveMaxChange = React.useCallback((value: number) => {
    const newMax = Math.max(value, filters.octaveRange[0]);
    updateFilters({ octaveRange: [filters.octaveRange[0], newMax] });
  }, [filters.octaveRange, updateFilters]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">音符過濾器</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 八度範圍 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            八度範圍: {filters.octaveRange[0]} - {filters.octaveRange[1]}
          </label>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500">下限</label>
              <input
                type="range"
                min="0"
                max="8"
                value={filters.octaveRange[0]}
                onChange={(e) => handleOctaveMinChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">上限</label>
              <input
                type="range"
                min="0"
                max="8"
                value={filters.octaveRange[1]}
                onChange={(e) => handleOctaveMaxChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
        </div>

        {/* 音量閾值 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            音量閾值: {filters.volumeThreshold}dB
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.volumeThreshold}
            onChange={(e) => updateFilters({ volumeThreshold: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0dB</span>
            <span>100dB</span>
          </div>
        </div>

        {/* 切換選項 */}
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.showOnlyHighVolume}
              onChange={(e) => updateFilters({ showOnlyHighVolume: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">僅顯示高音量音符</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.highlightBestFrequencies}
              onChange={(e) => updateFilters({ highlightBestFrequencies: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">突出顯示最佳頻率</span>
          </label>
        </div>

        {/* 統計信息 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">統計信息</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>可用音符:</span>
              <span className="font-medium text-gray-900">{availableNotesCount}</span>
            </div>
            <div className="flex justify-between">
              <span>已選音符:</span>
              <span className="font-medium text-blue-600">{selectedNotesCount}</span>
            </div>
            <div className="flex justify-between">
              <span>頻率範圍:</span>
              <span className="font-medium text-gray-900">
                {frequencyRange.min}-{frequencyRange.max}Hz
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 快速設置 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">快速設置</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateFilters({
              octaveRange: [2, 6],
              volumeThreshold: 50,
              showOnlyHighVolume: false,
              highlightBestFrequencies: true
            })}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            預設值
          </button>
          <button
            onClick={() => updateFilters({
              octaveRange: [4, 6],
              volumeThreshold: 70,
              showOnlyHighVolume: true,
              highlightBestFrequencies: true
            })}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            高品質音符
          </button>
          <button
            onClick={() => updateFilters({
              octaveRange: [0, 8],
              volumeThreshold: 0,
              showOnlyHighVolume: false,
              highlightBestFrequencies: false
            })}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            顯示全部
          </button>
        </div>
      </div>
    </div>
  );
};