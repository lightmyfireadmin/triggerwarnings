import { describe, it, expect } from 'vitest';
import { isSupportedPlatform } from './platformDetection';
describe('platformDetection', () => {
    it('should detect Netflix', () => {
        expect(isSupportedPlatform('https://www.netflix.com/watch/12345')).toBe(true);
    });
    it('should detect Amazon Prime', () => {
        expect(isSupportedPlatform('https://www.amazon.com/gp/video/detail/B00000')).toBe(true);
    });
    it('should not detect unsupported sites', () => {
        expect(isSupportedPlatform('https://www.google.com')).toBe(false);
    });
});
//# sourceMappingURL=platformDetection.test.js.map