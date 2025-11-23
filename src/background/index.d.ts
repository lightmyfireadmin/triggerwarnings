/**
 * Background service worker
 * Handles message routing, Supabase initialization, and extension lifecycle
 */
declare module 'webextension-polyfill' {
    namespace offscreen {
        enum Reason {
            DOM_PARSER = "DOM_PARSER",
            BLOBS = "BLOBS",
            IFRAME_SCRIPTING = "IFRAME_SCRIPTING",
            USER_MEDIA = "USER_MEDIA",
            DISPLAY_MEDIA = "DISPLAY_MEDIA",
            AUDIO_PLAYBACK = "AUDIO_PLAYBACK"
        }
        interface CreateParameters {
            reasons: Reason[];
            url: string;
            justification: string;
        }
        function createDocument(parameters: CreateParameters): Promise<void>;
        function hasDocument(): Promise<boolean>;
        function closeDocument(): Promise<void>;
    }
}
export {};
//# sourceMappingURL=index.d.ts.map