import { writable } from 'svelte/store';
import type { ColorAnalysis } from '@shared/types/analysis.types';

export interface AudioAnalysisData {
  frequencyData: Uint8Array;
  sampleRate: number;
  binCount: number;
}

export const analysisStore = {
  // Toggle for the overlay
  isVisible: writable<boolean>(false),

  // Real-time data
  audioData: writable<AudioAnalysisData | null>(null),
  visualData: writable<ColorAnalysis | null>(null),

  // Stats
  fps: writable<number>(0),
  processingTime: writable<number>(0)
};
