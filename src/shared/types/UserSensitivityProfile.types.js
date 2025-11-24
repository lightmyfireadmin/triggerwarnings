/**
 * User Sensitivity Profile Types
 */
/**
 * Threshold mappings for each sensitivity level
 *
 * Lower threshold = more sensitive (warns at lower confidence)
 * Higher threshold = less sensitive (requires higher confidence to warn)
 */
export const SENSITIVITY_THRESHOLDS = {
    'very-high': 40, // Extremely sensitive - warn for any indication
    'high': 60, // Standard protection (default for most users)
    'medium': 75, // Only warn for clear/sustained content
    'low': 85, // Only warn for extreme/graphic content
    'off': 100 // Will never trigger (impossible threshold)
};
/**
 * Default sensitivity profile for new users
 */
export const DEFAULT_SENSITIVITY_PROFILE = {
    // All categories default to "high" sensitivity
    categorySettings: {
        // Visual triggers
        'blood': 'high',
        'gore': 'high',
        'vomit': 'high',
        'dead_body_body_horror': 'high',
        'medical_procedures': 'high',
        'flashing_lights': 'high',
        'insects_spiders': 'high',
        'needles_injections': 'high',
        'claustrophobia_triggers': 'high',
        'snakes_reptiles': 'high',
        'photosensitivity': 'high',
        // Audio triggers
        'gunshots': 'high',
        'detonations_bombs': 'high',
        'jumpscares': 'high',
        'children_screaming': 'high',
        'explosions': 'high',
        'screams': 'high',
        'loud_noises': 'high',
        // Text triggers
        'lgbtq_phobia': 'high',
        'racial_violence': 'high',
        'eating_disorders': 'high',
        'religious_trauma': 'high',
        'slurs': 'high',
        'hate_speech': 'high',
        'threats': 'high',
        'swear_words': 'high',
        // Temporal triggers
        'animal_cruelty': 'high',
        'violence': 'high',
        'torture': 'high',
        'murder': 'high',
        'physical_violence': 'high',
        'car_crashes': 'high',
        // Multi-modal balanced triggers
        'self_harm': 'high',
        'suicide': 'high',
        'sexual_assault': 'high',
        'domestic_violence': 'high',
        'child_abuse': 'high',
        'sex': 'medium',
        'drugs': 'medium',
        'pregnancy_childbirth': 'medium',
        'natural_disasters': 'medium',
        'cannibalism': 'high',
        'photosensitivity': 'high',
        'death_dying': 'high'
    },
    advancedSettings: {
        nighttimeMode: false,
        nighttimeBoost: 0.10, // +10% sensitivity at night
        nighttimeStartHour: 22,
        nighttimeEndHour: 7,
        stressMode: false,
        stressModeBoost: 0.20, // +20% sensitivity when stressed
        adaptiveLearning: true, // Enabled by default
        learningRate: 0.10,
        desensitizationEnabled: false,
        desensitizationRate: 0.05 // 5% per week
    },
    lastUpdated: Date.now(),
    version: 1
};
//# sourceMappingURL=UserSensitivityProfile.types.js.map