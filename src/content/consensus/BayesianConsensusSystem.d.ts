/**
 * BAYESIAN CONSENSUS SYSTEM (Innovation #37)
 *
 * Implements a decentralized Bayesian consensus mechanism for community-driven
 * trigger verification. Aggregates user feedback to establish "ground truth"
 * probabilities for triggers, weighing votes by user reliability.
 *
 * **THE PROBLEM:**
 * - Single-user detection is prone to false positives/negatives.
 * - Different users have different sensitivities (subjectivity).
 * - "Trolls" or malicious users might spam false reports.
 * - New content lacks ground truth labels.
 *
 * **THE SOLUTION:**
 * - Bayesian updates: Prior (AI detection) + Likelihood (User Votes) → Posterior.
 * - User Reliability Scoring: Users gain reputation for agreeing with consensus.
 * - Content Fingerprinting: Map votes to specific content segments.
 * - Sybil Resistance: Weigh votes by reliability, not just count.
 * - Persistence: Use local storage to persist consensus state across sessions.
 *
 * **MATHEMATICAL MODEL:**
 * - Beta Distribution (α, β) for trigger probability.
 * - Prior: Beta(α_0, β_0) derived from AI confidence.
 * - Update: α_new = α + Σ(vote_i * reliability_i)
 *           β_new = β + Σ((1-vote_i) * reliability_i)
 *
 * **BENEFITS:**
 * - "Crowd wisdom" improves accuracy over time.
 * - Self-correcting: False positives get voted down.
 * - Personalized consensus: Can segment by user groups (e.g., "sensitive users").
 * - Robust against spam/gaming.
 * - Note: Currently operates as a **local consensus** (history reinforcement) due to
 *   privacy-first local storage. Architecture supports remote sync for true community voting.
 *
 * Created by: Claude Code (Algorithm 3.0 Innovation Session)
 * Date: 2025-11-12
 */
import type { TriggerCategory } from '@shared/types/Warning.types';
/**
 * Vote from a user
 */
export interface ConsensusVote {
    userId: string;
    category: TriggerCategory;
    contentId: string;
    timestamp: number;
    vote: 'confirm' | 'dismiss';
    userReliability?: number;
}
/**
 * Consensus state for a specific content segment
 */
export interface ConsensusState {
    contentId: string;
    category: TriggerCategory;
    alpha: number;
    beta: number;
    aiConfidence: number;
    totalVotes: number;
    lastUpdated: number;
    consensusProbability: number;
    confidenceScore: number;
}
/**
 * Bayesian Consensus System
 */
export declare class BayesianConsensusSystem {
    private consensusCache;
    private userReliabilityCache;
    private readonly DEFAULT_RELIABILITY;
    private readonly MAX_RELIABILITY;
    private readonly MIN_RELIABILITY;
    private readonly PRIOR_WEIGHT;
    private readonly STORAGE_KEY;
    private readonly SYNC_INTERVAL_MS;
    private stats;
    private storageLoaded;
    private pendingOperations;
    constructor();
    /**
     * Initialize consensus for a content segment based on AI detection
     * Called when AI first detects something, to establish a prior.
     */
    initializeConsensus(contentId: string, category: TriggerCategory, aiConfidence: number): ConsensusState;
    /**
     * Process a user vote
     */
    processVote(vote: ConsensusVote): ConsensusState;
    /**
     * Get current consensus for a trigger
     */
    getConsensus(contentId: string, category: TriggerCategory): ConsensusState | null;
    /**
     * Get user reliability score
     */
    getUserReliability(userId: string): number;
    /**
     * Update user reliability based on agreement with consensus
     *
     * @param voteType The user's vote ('confirm' or 'dismiss')
     * @param currentProbability The new consensus probability (0-1)
     */
    private updateUserReliability;
    /**
     * Generate a cache key
     */
    private getCacheKey;
    /**
     * Load state from Chrome local storage
     */
    private loadFromStorage;
    /**
     * Save state to Chrome local storage
     */
    private saveToStorage;
    private processPendingOperations;
    /**
     * Get system statistics
     */
    getStats(): {
        trackedItems: number;
        trackedUsers: number;
        avgConsensusProbability: number;
        storageLoaded: boolean;
        totalVotesProcessed: number;
        consensusUpdates: number;
        reliabilityUpdates: number;
        spamFiltered: number;
    };
    private getAverageProbability;
    /**
     * Clear all state (for testing)
     */
    clear(): Promise<void>;
}
/**
 * Singleton instance
 */
export declare const bayesianConsensusSystem: BayesianConsensusSystem;
//# sourceMappingURL=BayesianConsensusSystem.d.ts.map