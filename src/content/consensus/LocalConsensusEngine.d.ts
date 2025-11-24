export interface LocalVote {
    videoId: string;
    categoryKey: string;
    timestamp: number;
    vote: 'confirm' | 'wrong';
    createdAt: number;
}
export declare class LocalConsensusEngine {
    private static instance;
    private votes;
    private categoryWeights;
    private constructor();
    static getInstance(): LocalConsensusEngine;
    private loadVotes;
    private saveVotes;
    private recalculateWeights;
    /**
     * Record a vote locally
     */
    recordVote(videoId: string, categoryKey: string, timestamp: number, vote: 'confirm' | 'wrong'): Promise<void>;
    /**
     * Get personalized threshold adjustment for a category
     * Returns positive number (increase threshold) or 0
     */
    getThresholdAdjustment(categoryKey: string): number;
    /**
     * Check if user has already voted on this segment
     * Returns vote type or null
     */
    getPreviousVote(videoId: string, categoryKey: string, timestamp: number): 'confirm' | 'wrong' | null;
    /**
     * Get all local stats
     */
    getStats(): {
        totalVotes: number;
        confirm: number;
        wrong: number;
        categoryAdjustments: {
            [k: string]: number;
        };
    };
}
//# sourceMappingURL=LocalConsensusEngine.d.ts.map