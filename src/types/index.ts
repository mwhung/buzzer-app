// 核心數據類型定義

export interface Buzzer {
  buzzer_name: string;
  frequencies: number[];
  spl_values: number[];
}

export interface Pattern {
  id?: string;
  name: string;
  pattern: [number, number][]; // [frequency, duration]
  createdAt?: string;
  modifiedAt?: string;
}

export interface Note {
  name: string; // C, C#, D, D#, E, F, F#, G, G#, A, A#, B
  octave: number; // 0-8
  frequency: number;
  spl?: number; // SPL value if available in buzzer profile
}

export interface MusicalKey {
  tonic: string; // 主音
  mode: 'major' | 'minor' | 'dorian' | 'mixolydian' | 'custom';
  notes: string[]; // 調內音符
}

export interface PlaybackState {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  patternId?: string;
}

export interface ExportOptions {
  format: 'wav' | 'json' | 'both';
  quality: 'high' | 'medium' | 'low';
  sampleRate?: number;
  bitDepth?: number;
}

export interface WorkflowStage {
  id: string;
  name: string;
  component: string;
  canGoBack: boolean;
  canGoNext: boolean;
}

// 工作流程階段枚舉
export enum WorkflowStages {
  PROFILE_MANAGEMENT = 'profile-management',
  DESIGN_WORKBENCH = 'design-workbench',
  EXPORT_MANAGER = 'export-manager'
}

// 音樂理論相關類型
export interface MusicalBoardFilter {
  key?: MusicalKey;
  octaveRange?: [number, number];
  volumeRange?: [number, number];
  showOnlyProfileNotes?: boolean;
}

// 事件類型
export interface AudioEvent {
  type: 'play' | 'stop' | 'pause' | 'step';
  patternId?: string;
  stepIndex?: number;
  frequency?: number;
  duration?: number;
}

export interface PatternEvent {
  type: 'create' | 'update' | 'delete' | 'select';
  pattern?: Pattern;
  patternId?: string;
}

export interface ProfileEvent {
  type: 'select' | 'import' | 'create' | 'delete';
  profile?: Buzzer;
  profileId?: string;
}