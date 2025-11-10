/**
 * Warning manager - core logic for warning system
 */
import type { ActiveWarning } from '@shared/types/Warning.types';
import type { IStreamingProvider } from '@shared/types/Provider.types';
export declare class WarningManager {
    private provider;
    private profile;
    private warnings;
    private activeWarnings;
    private ignoredTriggersThisSession;
    private ignoredCategoriesForVideo;
    private rafId;
    private lastCheckTime;
    private currentVideoId;
    private static warningCache;
    private subtitleAnalyzer;
    private photosensitivityDetector;
    private enableSubtitleAnalysis;
    private enablePhotosensitivityDetection;
    private protectionManager;
    private onWarningCallback;
    private onWarningEndCallback;
    constructor(provider: IStreamingProvider);
    /**
     * Initialize the warning manager
     */
    initialize(): Promise<void>;
    /**
     * Initialize real-time detection systems
     */
    private initializeDetectors;
    /**
     * Fetch warnings for a video
     */
    private fetchWarnings;
    /**
     * Filter warnings based on active profile
     */
    private filterWarningsByProfile;
    /**
     * Re-filter warnings when profile changes
     */
    private refilterWarnings;
    /**
     * Start monitoring video playback using requestAnimationFrame
     */
    private startMonitoring;
    /**
     * Stop monitoring video playback
     */
    private stopMonitoring;
    /**
     * Check for active warnings at current playback time
     */
    private checkWarnings;
    /**
     * Trigger warning callback
     */
    private triggerWarning;
    /**
     * Trigger warning end callback
     */
    private triggerWarningEnd;
    /**
     * Apply warning protection (blackout/mute)
     */
    private applyWarningAction;
    /**
     * Get protection type for a category
     * Checks per-category override first, then falls back to default
     */
    private getProtectionType;
    /**
     * Handle media change
     */
    private handleMediaChange;
    /**
     * Ignore a trigger for this session
     */
    ignoreThisTime(warningId: string): void;
    /**
     * Ignore a category for this video
     */
    ignoreForVideo(categoryKey: string): void;
    /**
     * Register callback for warnings
     */
    onWarning(callback: (warning: ActiveWarning) => void): void;
    /**
     * Register callback for warning end
     */
    onWarningEnd(callback: (warningId: string) => void): void;
    /**
     * Clean up
     */
    dispose(): void;
}
//# sourceMappingURL=WarningManager.d.ts.map