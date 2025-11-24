import type { ColorAnalysis } from '@shared/types/analysis.types';
export interface AudioAnalysisData {
    frequencyData: Uint8Array;
    sampleRate: number;
    binCount: number;
}
export declare const analysisStore: {
    isVisible: import("svelte/store").Writable<boolean>;
    audioData: import("svelte/store").Writable<AudioAnalysisData | null>;
    visualData: import("svelte/store").Writable<ColorAnalysis | null>;
    fps: import("svelte/store").Writable<number>;
    processingTime: import("svelte/store").Writable<number>;
};
//# sourceMappingURL=AnalysisStore.d.ts.map