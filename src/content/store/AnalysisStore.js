import { writable } from 'svelte/store';
export const analysisStore = {
    // Toggle for the overlay
    isVisible: writable(false),
    // Real-time data
    audioData: writable(null),
    visualData: writable(null),
    // Stats
    fps: writable(0),
    processingTime: writable(0)
};
//# sourceMappingURL=AnalysisStore.js.map