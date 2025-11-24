/**
 * Category icon mapping configuration
 * Maps category keys to their respective icon files
 */
import type { TriggerCategory } from '../types/Warning.types';
/**
 * Icon display mode
 * - 'emoji': Use emoji characters (default for backward compatibility)
 * - 'png': Use PNG icon files from src/assets/category-icons/
 */
export type IconMode = 'emoji' | 'png';
/**
 * Current icon mode - can be configured based on build environment
 */
export declare const ICON_MODE: IconMode;
/**
 * Category icon file names (without .png extension)
 * Maps category key to icon filename
 */
export declare const CATEGORY_ICON_FILES: Record<TriggerCategory, string>;
/**
 * Get icon path for a category
 * @param category - The trigger category
 * @param mode - Icon mode (emoji or png)
 * @returns Icon path or emoji character
 */
export declare function getCategoryIcon(category: TriggerCategory, mode?: IconMode): string;
/**
 * Preload all category icon images
 * Call this during app initialization to improve performance
 */
export declare function preloadCategoryIcons(): void;
/**
 * Get icon as IMG element (for React/Svelte components)
 * @param category - The trigger category
 * @param alt - Alt text for accessibility
 * @param className - Optional CSS class
 */
export declare function getCategoryIconElement(category: TriggerCategory, alt?: string, className?: string): string;
//# sourceMappingURL=category-icon-mapping.d.ts.map