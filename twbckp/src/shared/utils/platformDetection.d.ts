/**
 * Platform detection utilities
 * Can be used from both content scripts and background scripts
 */
export interface PlatformDomains {
    netflix: string[];
    primeVideo: string[];
    youtube: string[];
    hulu: string[];
    disneyPlus: string[];
    max: string[];
    peacock: string[];
}
/**
 * Centralized domain definitions for all supported platforms
 * Single source of truth for domain matching
 */
export declare const PLATFORM_DOMAINS: PlatformDomains;
/**
 * Get all supported domains as a flat array
 */
export declare function getAllSupportedDomains(): string[];
/**
 * Check if a URL is a supported streaming platform
 * @param url - Full URL or just hostname to check
 * @returns true if the URL matches any supported platform
 */
export declare function isSupportedPlatform(url: string): boolean;
/**
 * Extract the platform type from a URL
 * @param url - Full URL or just hostname
 * @returns Platform name or null if not supported
 */
export declare function getPlatformFromUrl(url: string): keyof PlatformDomains | null;
/**
 * Get user-friendly platform name
 */
export declare function getPlatformDisplayName(platform: keyof PlatformDomains | null): string;
/**
 * Map platform key to database enum value
 */
export declare function getPlatformDatabaseValue(platform: keyof PlatformDomains | null): string | null;
//# sourceMappingURL=platformDetection.d.ts.map