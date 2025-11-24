/**
 * USER SENSITIVITY PROFILE - Algorithm 3.0 Innovation #30
 *
 * Per-category sensitivity configuration allowing users to customize their
 * trigger warning experience for EACH of the 28 trigger categories.
 *
 * **THE PERSONALIZATION PROMISE:**
 * - User A: Very sensitive to vomit (40% threshold), medium for blood (75%)
 * - User B: Very sensitive to eating disorders (40%), low for violence (85%)
 * - User C: Off for spiders, very high for medical procedures
 * - ALL 28 categories individually configurable
 *
 * Features:
 * - 5 sensitivity levels per category (very-high, high, medium, low, off)
 * - Advanced settings (nighttime mode, stress mode, adaptive learning)
 * - Context-aware settings (educational vs fictional vs news)
 * - Progressive desensitization support (therapeutic)
 * - Cloud sync across devices
 *
 * Created by: Claude Code (Algorithm 3.0 Revolutionary Session)
 * Date: 2025-11-11
 */
import type { TriggerCategory } from '@shared/types/Warning.types';
import { type UserSensitivityProfile, type SensitivityLevel, type ContentContext } from '@shared/types/UserSensitivityProfile.types';
export type { UserSensitivityProfile, SensitivityLevel, ContentContext, AdvancedSettings, ContextualSettings } from '@shared/types/UserSensitivityProfile.types';
export { SENSITIVITY_THRESHOLDS, DEFAULT_SENSITIVITY_PROFILE } from '@shared/types/UserSensitivityProfile.types';
/**
 * User Sensitivity Profile Manager
 *
 * Manages loading, saving, and applying user sensitivity profiles
 */
export declare class UserSensitivityProfileManager {
    private currentProfile;
    private stats;
    /**
     * Load user profile (from storage or default)
     */
    loadProfile(userId: string): Promise<UserSensitivityProfile>;
    /**
     * Save user profile to storage
     */
    saveProfile(profile: UserSensitivityProfile): Promise<void>;
    /**
     * Get current loaded profile
     */
    getCurrentProfile(): UserSensitivityProfile | null;
    /**
     * Calculate threshold for a specific category
     *
     * Applies all modifiers:
     * - Base sensitivity level
     * - Context adjustments (if applicable)
     * - Time-of-day adjustments
     * - Stress mode adjustments
     * - Desensitization progress
     */
    calculateThreshold(category: TriggerCategory, context?: ContentContext): number;
    /**
     * Check if current time is nighttime
     */
    private isNighttime;
    /**
     * Update category sensitivity
     */
    updateCategorySensitivity(category: TriggerCategory, sensitivity: SensitivityLevel): Promise<void>;
    /**
     * Enable/disable stress mode
     */
    setStressMode(enabled: boolean): Promise<void>;
    /**
     * Set all categories to same sensitivity (bulk update)
     */
    setAllCategories(sensitivity: SensitivityLevel): Promise<void>;
    /**
     * Get statistics
     */
    getStats(): {
        profileLoads: number;
        profileSaves: number;
        thresholdCalculations: number;
        contextAdjustments: number;
        timeAdjustments: number;
        stressAdjustments: number;
    };
}
/**
 * Export singleton instance
 */
export declare const userSensitivityProfileManager: UserSensitivityProfileManager;
/**
 * EQUAL TREATMENT THROUGH PERSONALIZATION
 *
 * This system ensures:
 * ✅ ALL 28 categories individually configurable
 * ✅ 5 sensitivity levels per category (very-high, high, medium, low, off)
 * ✅ Context-aware settings (educational vs fictional vs news)
 * ✅ Time-based adjustments (nighttime mode +10% sensitivity)
 * ✅ Stress mode for difficult days (+20% sensitivity)
 * ✅ Progressive desensitization support (therapeutic)
 * ✅ Cloud sync across devices
 *
 * USER EXAMPLES:
 * - User with emetophobia: vomit = very-high (40%), others = medium
 * - User in ED recovery: eating_disorders = very-high (40%), violence = low (85%)
 * - Medical student: medical_procedures = off (100%), blood = medium (75%)
 *
 * **NO USER LEFT BEHIND - PERSONALIZATION FOR ALL**
 */
//# sourceMappingURL=UserSensitivityProfile.d.ts.map