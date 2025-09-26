import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Upload, Download, Plus, Trash2, Volume2, Settings, Music, FileText, Save, CheckSquare, Square as SquareIcon } from 'lucide-react';

// 定義類型
interface Buzzer {
  buzzer_name: string;
  frequencies: number[];
  spl_values: number[];
}

interface Pattern {
  name: string;
  pattern: [number, number][];
}

const BuzzerSimulator = () => {
  // 預設的buzzer數據
  const defaultBuzzer: Buzzer = {
    buzzer_name: "Default Buzzer",
    frequencies: [440, 466, 494, 523, 554, 587, 622, 659, 699, 740, 784, 831, 880, 932, 988, 1047, 1109, 1175, 1245, 1319, 1398, 1480, 1568, 1661, 1760, 1865, 1976, 2093, 2217, 2349, 2489, 2637, 2794, 2960, 3136, 3322, 3520, 3729, 3951, 4186, 4435, 4699, 4978, 5274, 5588, 5920, 6272, 6645, 7040],
    spl_values: [49.7, 50.4, 48, 48.2, 51.2, 52.3, 51.1, 48.3, 46.2, 49.4, 53.3, 54.8, 54.1, 49.8, 48.3, 49, 51.2, 51.5, 56.1, 58.5, 59, 56.3, 49.1, 44.4, 47.7, 51.1, 53.1, 50.1, 48.9, 47.3, 49.9, 59.4, 59.9, 63.1, 64.3, 62.6, 63.2, 66.8, 70.3, 71.5, 68.7, 60.3, 47.9, 37.8, 51.9, 60.2, 53.5, 48.9, 50.8]
  };

  const [buzzers, setBuzzers] = useState<Buzzer[]>([defaultBuzzer]);
  const [currentBuzzer, setCurrentBuzzer] = useState(0);
  const [patterns, setPatterns] = useState<Pattern[]>([
    {
      name: "示例Pattern",
      pattern: [
        [440, 200],
        [523, 300],
        [0, 100],
        [659, 150]
      ]
    },
    {
      name: "音量測試Pattern",
      pattern: [
        [5274, 500],  // 最低音量 (37.8dB)
        [0, 200],     // 靜音間隔
        [440, 500],   // 低音量 (49.7dB)
        [0, 200],     // 靜音間隔
        [2960, 500],  // 高音量 (63.1dB)
        [0, 200],     // 靜音間隔
        [4186, 500],  // 最高音量 (71.5dB)
        [0, 200],     // 靜音間隔
        [1661, 500]   // 極低音量 (44.4dB)
      ]
    }
  ]);
  const [currentPattern, setCurrentPattern] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingStep, setPlayingStep] = useState(-1);
  const [newPatternName, setNewPatternName] = useState('');
  const [editingPattern, setEditingPattern] = useState('');
  const [masterVolume, setMasterVolume] = useState(0.3); // 主音量控制，默認30%
  
  // 保存新Pattern相關狀態
  const [saveAsNewPatternName, setSaveAsNewPatternName] = useState('');
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  
  // 批量導出相關狀態
  const [selectedPatterns, setSelectedPatterns] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // 初始化音頻上下文
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // 確保音頻上下文已啟動
  const ensureAudioContextStarted = async (): Promise<void> => {
    if (!audioContextRef.current) return;
    
    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log('AudioContext resumed successfully');
      } catch (error) {
        console.error('Failed to resume AudioContext:', error);
      }
    }
  };

  // 根據SPL值計算音量
  const calculateVolume = (frequency: number): number => {
    const buzzer = buzzers[currentBuzzer];
    const freqIndex = buzzer.frequencies.indexOf(frequency);
    if (freqIndex === -1) {
      console.log(`頻率 ${frequency}Hz 不在 buzzer profile 中，使用默認音量 0.1`);
      return 0.1 * masterVolume; // 應用主音量控制
    }
  
    const spl = buzzer.spl_values[freqIndex];
    const maxSPL = Math.max(...buzzer.spl_values);
  
    // dB SPL → 電壓轉換公式（音量對應）
    const volume = Math.pow(10, (spl - maxSPL) / 20);
  
    // 安全邊界限制
    const normalizedVolume = Math.min(Math.max(volume, 0.01), 1.0);
    
    // 應用主音量控制
    const finalVolume = normalizedVolume * masterVolume;
  
    console.log(`頻率 ${frequency}Hz: SPL=${spl}dB → 標準音量=${normalizedVolume.toFixed(3)} → 最終音量=${finalVolume.toFixed(3)} (主音量=${masterVolume.toFixed(2)})`);
  
    return finalVolume;
  };

  // 播放單個音符
  const playTone = (frequency: number, duration: number): Promise<void> => {
    if (!audioContextRef.current) {
      console.error('AudioContext not available');
      return Promise.resolve();
    }

    // 停止之前的音符
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {
        // 忽略已經停止的錯誤
      }
      oscillatorRef.current = null;
    }

    if (frequency === 0) {
      // 靜音 - 也需要能被中斷
      return new Promise<void>(resolve => {
        timeoutRef.current = window.setTimeout(() => {
          // 檢查是否仍在播放
          if (isPlayingRef.current) {
            resolve();
          } else {
            resolve(); // 即使被中斷也要 resolve
          }
        }, duration);
      });
    }

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      
      const volume = calculateVolume(frequency);
      // 移除音量包絡效果，直接設定目標音量
      gainNode.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;
      
      oscillator.start(audioContextRef.current.currentTime);
      
      return new Promise<void>(resolve => {
        timeoutRef.current = window.setTimeout(() => {
          try {
            if (oscillator && oscillator.context.state !== 'closed') {
              oscillator.stop();
            }
          } catch (e) {
            // 忽略已經停止的錯誤
          }
          resolve();
        }, duration);
      });
    } catch (error) {
      console.error('Error playing tone:', error);
      return Promise.resolve();
    }
  };

  // 錄製單個pattern為音頻
  const recordPattern = async (patternIndex: number): Promise<Blob> => {
    await ensureAudioContextStarted();
    
    if (!audioContextRef.current) {
      throw new Error('AudioContext not available');
    }

    const pattern = patterns[patternIndex];
    const totalDuration = pattern.pattern.reduce((sum, [, duration]) => sum + duration, 0);
    
    // 創建離線音頻上下文進行錄製
    const sampleRate = 44100;
    const offlineContext = new OfflineAudioContext(1, Math.ceil(totalDuration * sampleRate / 1000), sampleRate);
    
    let currentTime = 0;
    
    for (const [frequency, duration] of pattern.pattern) {
      if (frequency > 0) {
        const oscillator = offlineContext.createOscillator();
        const gainNode = offlineContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, currentTime / 1000);
        
        const volume = calculateVolume(frequency);
        gainNode.gain.setValueAtTime(volume, currentTime / 1000);
        gainNode.gain.setValueAtTime(0, (currentTime + duration) / 1000);
        
        oscillator.connect(gainNode);
        gainNode.connect(offlineContext.destination);
        
        oscillator.start(currentTime / 1000);
        oscillator.stop((currentTime + duration) / 1000);
      }
      
      currentTime += duration;
    }
    
    const audioBuffer = await offlineContext.startRendering();
    
    // 將AudioBuffer轉換為Blob
    const wavBlob = audioBufferToWav(audioBuffer);
    return wavBlob;
  };

  // 將AudioBuffer轉換為WAV格式的Blob
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // 寫入音頻數據
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  // 批量導出選定的patterns
  const exportSelectedPatterns = async (): Promise<void> => {
    if (selectedPatterns.size === 0) {
      alert('請先選擇要導出的Pattern');
      return;
    }
    
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('開始導出...');
    
    try {
      const selectedIndices = Array.from(selectedPatterns);
      const total = selectedIndices.length;
      
      for (let i = 0; i < total; i++) {
        const patternIndex = selectedIndices[i];
        const pattern = patterns[patternIndex];
        
        setExportStatus(`正在導出: ${pattern.name} (${i + 1}/${total})`);
        
        const audioBlob = await recordPattern(patternIndex);
        
        // 下載文件
        const url = URL.createObjectURL(audioBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${pattern.name}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setExportProgress(((i + 1) / total) * 100);
        
        // 添加小延遲以避免瀏覽器限制
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setExportStatus('導出完成！');
      setTimeout(() => {
        setIsExporting(false);
        setExportStatus('');
        setExportProgress(0);
      }, 2000);
      
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('導出失敗');
      setTimeout(() => {
        setIsExporting(false);
        setExportStatus('');
        setExportProgress(0);
      }, 2000);
    }
  };

  // 切換pattern選擇狀態
  const togglePatternSelection = (index: number): void => {
    const newSelected = new Set(selectedPatterns);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPatterns(newSelected);
  };

  // 全選/取消全選
  const toggleSelectAll = (): void => {
    if (selectedPatterns.size === patterns.length) {
      setSelectedPatterns(new Set());
    } else {
      setSelectedPatterns(new Set(patterns.map((_, index) => index)));
    }
  };

  // 測試音頻
  const testAudio = async (): Promise<void> => {
    await ensureAudioContextStarted();
    
    if (!audioContextRef.current || audioContextRef.current.state !== 'running') {
      alert('無法啟動音頻播放。請確保瀏覽器允許音頻播放。');
      return;
    }
    
    console.log('Testing audio with 440Hz tone for 500ms');
    await playTone(440, 500);
  };

  // 測試音量 profile
  const testVolumeProfile = async (): Promise<void> => {
    await ensureAudioContextStarted();
    
    if (!audioContextRef.current || audioContextRef.current.state !== 'running') {
      alert('無法啟動音頻播放。請確保瀏覽器允許音頻播放。');
      return;
    }
    
    const buzzer = buzzers[currentBuzzer];
    // 修改測試順序，與"音量測試Pattern"保持一致
    const testFrequencies = [
      { freq: 5274, expectedSPL: 37.8, desc: "最低音量" },
      { freq: 440, expectedSPL: 49.7, desc: "低音量" },
      { freq: 2960, expectedSPL: 63.1, desc: "高音量" },
      { freq: 4186, expectedSPL: 71.5, desc: "最高音量" },
      { freq: 1661, expectedSPL: 44.4, desc: "極低音量" }
    ];
    
    console.log('=== 音量 Profile 測試 ===');
    console.log('SPL 範圍:', Math.min(...buzzer.spl_values), 'dB 到', Math.max(...buzzer.spl_values), 'dB');
    console.log('測試順序與"音量測試Pattern"一致');
    
    for (const test of testFrequencies) {
      const volume = calculateVolume(test.freq);
      console.log(`${test.desc}: ${test.freq}Hz = ${test.expectedSPL}dB → 音量 ${volume.toFixed(3)}`);
      await playTone(test.freq, 800);
      await new Promise(resolve => setTimeout(resolve, 200)); // 間隔
    }
  };

  // 播放整個pattern
  const playPattern = async (): Promise<void> => {
    if (!patterns[currentPattern] || isPlayingRef.current) return;
    
    // 確保音頻上下文已啟動
    await ensureAudioContextStarted();
    
    if (!audioContextRef.current || audioContextRef.current.state !== 'running') {
      alert('無法啟動音頻播放。請確保瀏覽器允許音頻播放，並再試一次。');
      return;
    }
    
    // 同時設置 state 和 ref
    setIsPlaying(true);
    isPlayingRef.current = true;
    const pattern = patterns[currentPattern].pattern;
    
    console.log('Starting pattern playback:', pattern);
    
    try {
      for (let i = 0; i < pattern.length; i++) {
        // 使用 ref 來檢查播放狀態
        if (!isPlayingRef.current) {
          console.log('Playback interrupted at step', i + 1);
          break;
        }
        
        setPlayingStep(i);
        const [frequency, duration] = pattern[i];
        console.log(`Playing step ${i + 1}: ${frequency}Hz for ${duration}ms`);
        await playTone(frequency, duration);
      }
    } catch (error) {
      console.error('Error during pattern playback:', error);
    } finally {
      // 確保在任何情況下都能正確重置狀態
      setIsPlaying(false);
      isPlayingRef.current = false;
      setPlayingStep(-1);
      console.log('Pattern playback finished');
    }
  };

  // 停止播放
  const stopPlay = (): void => {
    console.log('Stop button clicked');
    
    // 同時設置 state 和 ref
    setIsPlaying(false);
    isPlayingRef.current = false;
    setPlayingStep(-1);
    
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {
        // 忽略已經停止的錯誤
      }
      oscillatorRef.current = null;
    }
    
    if (gainNodeRef.current) {
      gainNodeRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    console.log('Playback stopped');
  };

  // 新增pattern
  const addPattern = (): void => {
    if (!newPatternName.trim()) return;
    
    const newPattern: Pattern = {
      name: newPatternName,
      pattern: [[440, 200]]
    };
    
    setPatterns([...patterns, newPattern]);
    setNewPatternName('');
  };

  // 刪除pattern
  const deletePattern = (index: number): void => {
    if (patterns.length <= 1) return;
    
    const newPatterns = patterns.filter((_, i) => i !== index);
    setPatterns(newPatterns);
    
    if (currentPattern >= newPatterns.length) {
      setCurrentPattern(newPatterns.length - 1);
    }
  };

  // 更新pattern
  const updatePattern = (): void => {
    try {
      const parsedPattern = JSON.parse(editingPattern) as Pattern;
      if (parsedPattern.pattern && Array.isArray(parsedPattern.pattern)) {
        const newPatterns = [...patterns];
        newPatterns[currentPattern] = parsedPattern;
        setPatterns(newPatterns);
        setEditingPattern('');
      }
    } catch (e) {
      alert('JSON格式錯誤');
    }
  };

  // 保存為新Pattern
  const saveAsNewPattern = (): void => {
    if (!saveAsNewPatternName.trim()) {
      alert('請輸入Pattern名稱');
      return;
    }
    
    try {
      const parsedPattern = JSON.parse(editingPattern) as Pattern;
      if (parsedPattern.pattern && Array.isArray(parsedPattern.pattern)) {
        // 檢查名稱是否已存在
        const nameExists = patterns.some(p => p.name === saveAsNewPatternName.trim());
        if (nameExists) {
          const confirmed = confirm(`Pattern名稱 "${saveAsNewPatternName}" 已存在，是否覆蓋？`);
          if (!confirmed) return;
          
          // 覆蓋現有pattern
          const existingIndex = patterns.findIndex(p => p.name === saveAsNewPatternName.trim());
          const newPatterns = [...patterns];
          newPatterns[existingIndex] = {
            name: saveAsNewPatternName.trim(),
            pattern: parsedPattern.pattern
          };
          setPatterns(newPatterns);
        } else {
          // 創建新pattern
          const newPattern: Pattern = {
            name: saveAsNewPatternName.trim(),
            pattern: parsedPattern.pattern
          };
          setPatterns([...patterns, newPattern]);
        }
        
        // 重置狀態
        setSaveAsNewPatternName('');
        setShowSaveAsDialog(false);
        alert('Pattern保存成功！');
      }
    } catch (e) {
      alert('JSON格式錯誤，無法保存');
    }
  };

  // 匯入buzzer定義檔
  const importBuzzer = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const buzzerData = JSON.parse(result) as Buzzer;
          if (buzzerData.buzzer_name && buzzerData.frequencies && buzzerData.spl_values) {
            setBuzzers([...buzzers, buzzerData]);
          } else {
            alert('Buzzer定義檔格式錯誤');
          }
        }
      } catch (error) {
        alert('JSON格式錯誤');
      }
    };
    reader.readAsText(file);
  };

  // 匯入pattern檔
  const importPattern = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const patternData = JSON.parse(result) as Pattern;
          if (patternData.name && patternData.pattern) {
            setPatterns([...patterns, patternData]);
          } else {
            alert('Pattern檔案格式錯誤');
          }
        }
      } catch (error) {
        alert('JSON格式錯誤');
      }
    };
    reader.readAsText(file);
  };

  // 匯出當前pattern
  const exportPattern = (): void => {
    const dataStr = JSON.stringify(patterns[currentPattern], null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${patterns[currentPattern].name}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // 初始化編輯模式
  useEffect(() => {
    if (editingPattern === '' && patterns[currentPattern]) {
      setEditingPattern(JSON.stringify(patterns[currentPattern], null, 2));
    }
  }, [currentPattern, editingPattern, patterns]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Buzzer模擬器</h1>
                <p className="text-sm text-gray-500">專業音頻模式編輯工具</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Buzzer Selection Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Music className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Buzzer選擇</h2>
              </div>
              
              <div className="space-y-4">
                <select 
                  value={currentBuzzer} 
                  onChange={(e) => setCurrentBuzzer(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {buzzers.map((buzzer, index) => (
                    <option key={index} value={index}>{buzzer.buzzer_name}</option>
                  ))}
                </select>
                
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importBuzzer}
                    className="hidden"
                    id="buzzer-import"
                  />
                  <label htmlFor="buzzer-import" className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all text-center font-medium">
                    <Upload className="inline mr-2 w-4 h-4" />
                    匯入Buzzer
                  </label>
                </div>
              </div>
            </div>

            {/* Playback Controls Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Play className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">播放控制</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={playPattern}
                    disabled={isPlaying}
                    className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all font-medium"
                  >
                    <Play className="w-5 h-5" />
                    <span>播放</span>
                  </button>
                  <button
                    onClick={stopPlay}
                    className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-medium"
                  >
                    <Square className="w-5 h-5" />
                    <span>停止</span>
                  </button>
                </div>
                
                <div className="flex justify-center">
                  <button
                    onClick={testAudio}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium text-sm"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>測試音頻</span>
                  </button>
                </div>
                
                <div className="flex justify-center">
                  <button
                    onClick={testVolumeProfile}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-medium text-sm"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>測試音量 profile</span>
                  </button>
                </div>
                
                {isPlaying && (
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse-slow"></div>
                      <p className="text-sm text-blue-700 font-medium">
                        正在播放第 {playingStep + 1} 步 / {patterns[currentPattern].pattern.length} 步
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Volume Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Volume2 className="w-5 h-5 text-yellow-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">音量 Profile</h2>
              </div>
              
              <div className="space-y-4">
                {/* Master Volume Control */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-blue-800">主音量控制</label>
                    <span className="text-sm font-mono text-blue-700">{Math.round(masterVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="1.0"
                    step="0.01"
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-blue-600 mt-1">
                    <span>1%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-600 mb-2">音量映射公式:</div>
                  <div className="text-xs font-mono text-gray-700 space-y-1">
                    <div>1. dB SPL → 電壓轉換: 10^((SPL - {Math.max(...buzzers[currentBuzzer].spl_values).toFixed(1)}) / 20)</div>
                    <div>2. 安全邊界限制: min(max(音量, 0.01), 1.0)</div>
                    <div>3. 主音量控制: 標準音量 × {masterVolume.toFixed(2)}</div>
                    <div>4. 動態範圍: {(Math.pow(10, (Math.min(...buzzers[currentBuzzer].spl_values) - Math.max(...buzzers[currentBuzzer].spl_values)) / 20) * masterVolume).toFixed(3)} - {masterVolume.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pattern Management Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Pattern管理</h2>
              </div>
              
              <div className="space-y-4">
                <select 
                  value={currentPattern} 
                  onChange={(e) => setCurrentPattern(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  {patterns.map((pattern, index) => (
                    <option key={index} value={index}>{pattern.name}</option>
                  ))}
                </select>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPatternName}
                    onChange={(e) => setNewPatternName(e.target.value)}
                    placeholder="新Pattern名稱"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={addPattern}
                    className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    title="新增Pattern"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deletePattern(currentPattern)}
                    className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    disabled={patterns.length <= 1}
                    title="刪除Pattern"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importPattern}
                    className="hidden"
                    id="pattern-import"
                  />
                  <label htmlFor="pattern-import" className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-3 rounded-lg cursor-pointer hover:from-purple-600 hover:to-purple-700 transition-all text-center font-medium">
                    <Upload className="inline mr-2 w-4 h-4" />
                    匯入Pattern
                  </label>
                  <button
                    onClick={exportPattern}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-medium"
                  >
                    <Download className="inline mr-2 w-4 h-4" />
                    匯出Pattern
                  </button>
                </div>
              </div>
            </div>

            {/* Batch Audio Export Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Download className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">批量音頻導出</h2>
              </div>
              
              <div className="space-y-4">
                {/* Pattern Selection */}
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  <div className="p-3 bg-gray-50 border-b border-gray-200 sticky top-0">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {selectedPatterns.size === patterns.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <SquareIcon className="w-4 h-4" />
                      )}
                      <span>
                        {selectedPatterns.size === patterns.length ? '取消全選' : '全選'}
                        ({selectedPatterns.size}/{patterns.length})
                      </span>
                    </button>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {patterns.map((pattern, index) => (
                      <div key={index} className="p-3 hover:bg-gray-50 transition-colors">
                        <button
                          onClick={() => togglePatternSelection(index)}
                          className="flex items-center space-x-3 w-full text-left"
                        >
                          {selectedPatterns.has(index) ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <SquareIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {pattern.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {pattern.pattern.length} 步驟
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Export Controls */}
                <div className="space-y-3">
                  <button
                    onClick={exportSelectedPatterns}
                    disabled={selectedPatterns.size === 0 || isExporting}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 transition-all font-medium"
                  >
                    <Download className="inline mr-2 w-4 h-4" />
                    導出選定Pattern為音頻 ({selectedPatterns.size})
                  </button>
                  
                  {isExporting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{exportStatus}</span>
                        <span className="text-gray-600">{Math.round(exportProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${exportProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">
                    <strong>說明：</strong>
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• 選擇要導出的Pattern，點擊導出按鈕</li>
                    <li>• 每個Pattern將生成一個WAV音頻文件</li>
                    <li>• 音頻文件將自動下載到您的設備</li>
                    <li>• 導出過程中請勿關閉頁面</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Pattern Editor */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Pattern Preview Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Pattern預覽</h2>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {patterns[currentPattern]?.pattern.map((step, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border transition-all ${
                      playingStep === index 
                        ? 'bg-green-100 border-green-400 shadow-md scale-105' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900">
                          步驟 {index + 1}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          step[0] === 0 
                            ? 'bg-gray-100 text-gray-600' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {step[0] === 0 ? '靜音' : `${step[0]}Hz`}
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {step[1]}ms
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pattern Editor Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Save className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Pattern編輯器</h2>
              </div>
              
              <div className="space-y-4">
                <textarea
                  value={editingPattern}
                  onChange={(e) => setEditingPattern(e.target.value)}
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm resize-none"
                  placeholder="JSON格式Pattern..."
                />
                
                {/* 按鈕組 */}
                <div className="flex gap-3">
                  <button
                    onClick={updatePattern}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all font-medium"
                  >
                    <Save className="inline mr-2 w-4 h-4" />
                    更新現有Pattern
                  </button>
                  <button
                    onClick={() => setShowSaveAsDialog(true)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-medium"
                  >
                    <Plus className="inline mr-2 w-4 h-4" />
                    保存為新Pattern
                  </button>
                </div>
                
                {/* 保存為新Pattern對話框 */}
                {showSaveAsDialog && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Save className="w-5 h-5 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">保存為新Pattern</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pattern名稱
                          </label>
                          <input
                            type="text"
                            value={saveAsNewPatternName}
                            onChange={(e) => setSaveAsNewPatternName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveAsNewPattern();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setShowSaveAsDialog(false);
                                setSaveAsNewPatternName('');
                              }
                            }}
                            placeholder="輸入新Pattern名稱"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            autoFocus
                          />
                        </div>
                        
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowSaveAsDialog(false);
                              setSaveAsNewPatternName('');
                            }}
                            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                          >
                            取消
                          </button>
                          <button
                            onClick={saveAsNewPattern}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-medium"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="font-medium text-gray-900 mb-2">格式說明：</p>
                  <pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">{`{
  "name": "Pattern名稱",
  "pattern": [
    [頻率(Hz), 持續時間(ms)],
    [0, 100],  // 0代表靜音
    [440, 200]
  ]
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuzzerSimulator;