/**
 * i18n utilities for Chrome Extension
 *
 * Provides a Svelte-friendly wrapper around Chrome's i18n API with reactive stores
 */
import { writable } from 'svelte/store';
import browser from 'webextension-polyfill';
/**
 * Get a translated message from the extension's locale files
 *
 * @param key - The message key (e.g., 'extensionName')
 * @param substitutions - Optional substitution values for placeholders
 * @returns Translated string or the key if translation not found
 */
export function t(key, substitutions) {
    try {
        const message = browser.i18n.getMessage(key, substitutions);
        // If getMessage returns empty string, the key doesn't exist - return the key as fallback
        return message || key;
    }
    catch (error) {
        console.warn(`i18n: Failed to get message for key "${key}"`, error);
        return key;
    }
}
/**
 * Get current UI language code (e.g., 'en', 'es', 'fr')
 */
export function getLocale() {
    return browser.i18n.getUILanguage();
}
/**
 * Create a reactive Svelte store for a translation
 * Useful for reactive UI updates if locale changes
 *
 * @param key - The message key
 * @param substitutions - Optional substitution values
 * @returns Readable store containing the translated string
 */
export function createTranslationStore(key, substitutions) {
    return writable(t(key, substitutions));
}
/**
 * Svelte store containing the current locale
 */
export const locale = writable(getLocale());
/**
 * Helper for translations that need dynamic substitutions
 * Returns a function that takes substitutions and returns the translated string
 *
 * @param key - The message key
 * @returns Function that accepts substitutions and returns translated string
 */
export function tFunc(key) {
    return (substitutions) => t(key, substitutions);
}
/**
 * Batch translate multiple keys at once
 *
 * @param keys - Array of message keys
 * @returns Object mapping keys to translated strings
 */
export function tBatch(keys) {
    const result = {};
    for (const key of keys) {
        result[key] = t(key);
    }
    return result;
}
/**
 * Check if a translation key exists
 *
 * @param key - The message key to check
 * @returns true if the key exists, false otherwise
 */
export function hasTranslation(key) {
    const message = browser.i18n.getMessage(key);
    return message.length > 0;
}
// Export default object with all utilities
export default {
    t,
    tFunc,
    tBatch,
    getLocale,
    locale,
    hasTranslation,
    createTranslationStore,
};
//# sourceMappingURL=index.js.map