/**
 * Protection Overlay Manager
 * Manages blackout overlays and audio muting for active trigger warnings
 */
import type { IStreamingProvider } from '@shared/types/Provider.types';
import type { ProtectionType } from '@shared/types/Profile.types';
export declare class ProtectionOverlayManager {
    private provider;
    private activeProtections;
    constructor(provider: IStreamingProvider);
    /**
     * Apply protection for a warning
     */
    applyProtection(warningId: string, protectionType: ProtectionType, categoryName?: string, warningDescription?: string): void;
    /**
     * Apply blackout overlay
     */
    private applyBlackout;
    /**
     * Apply audio mute
     */
    private applyMute;
    /**
     * Remove protection for a warning
     */
    removeProtection(warningId: string): void;
    /**
     * Remove all protections
     */
    removeAllProtections(): void;
    /**
     * Check if a warning has active protection
     */
    hasProtection(warningId: string): boolean;
    /**
     * Get active protection count
     */
    getActiveCount(): number;
    /**
     * Clean up
     */
    dispose(): void;
}
//# sourceMappingURL=ProtectionOverlayManager.d.ts.map