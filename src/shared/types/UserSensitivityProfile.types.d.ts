/**
 * User Sensitivity Profile Types
 */
import type { TriggerCategory } from './Warning.types';
/**
 * Sensitivity levels with associated confidence thresholds
 */
export type SensitivityLevel = 'very-high' | 'high' | 'medium' | 'low' | 'off';
/**
 * Content context types for context-aware sensitivity
 */
export type ContentContext = 'educational' | 'fictional' | 'news-documentary' | 'unknown';
/**
 * Threshold mappings for each sensitivity level
 *
 * Lower threshold = more sensitive (warns at lower confidence)
 * Higher threshold = less sensitive (requires higher confidence to warn)
 */
export declare const SENSITIVITY_THRESHOLDS: Record<SensitivityLevel, number>;
/**
 * Advanced user settings
 */
export interface AdvancedSettings {
    nighttimeMode: boolean;
    nighttimeBoost: number;
    nighttimeStartHour: number;
    nighttimeEndHour: number;
    stressMode: boolean;
    stressModeBoost: number;
    adaptiveLearning: boolean;
    learningRate: number;
    desensitizationEnabled: boolean;
    desensitizationRate: number;
}
/**
 * Context-specific sensitivity settings
 *
 * Allows different sensitivity levels based on content type
 */
export interface ContextualSettings {
    educational: SensitivityLevel;
    fictional: SensitivityLevel;
    newsDocumentary: SensitivityLevel;
    unknown: SensitivityLevel;
}
/**
 * User sensitivity profile
 *
 * Stores all personalization settings for a user
 */
export interface UserSensitivityProfile {
    userId: string;
    categorySettings: Record<TriggerCategory, SensitivityLevel>;
    contextualSettings?: Partial<Record<TriggerCategory, ContextualSettings>>;
    advancedSettings: AdvancedSettings;
    lastUpdated: number;
    version: number;
}
/**
 * Default sensitivity profile for new users
 */
export declare const DEFAULT_SENSITIVITY_PROFILE: Omit<UserSensitivityProfile, 'userId'>;
//# sourceMappingURL=UserSensitivityProfile.types.d.ts.map