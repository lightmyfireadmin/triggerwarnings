import { Logger } from '@shared/utils/logger';

const logger = new Logger('LocalConsensusEngine');

export interface LocalVote {
  videoId: string;
  categoryKey: string;
  timestamp: number;
  vote: 'confirm' | 'wrong';
  createdAt: number;
}

export class LocalConsensusEngine {
  private static instance: LocalConsensusEngine;
  private votes: LocalVote[] = [];

  // Weights for personalized detection
  private categoryWeights: Map<string, number> = new Map();

  private constructor() {
    this.loadVotes();
  }

  static getInstance(): LocalConsensusEngine {
    if (!LocalConsensusEngine.instance) {
      LocalConsensusEngine.instance = new LocalConsensusEngine();
    }
    return LocalConsensusEngine.instance;
  }

  private async loadVotes() {
    try {
      // Using chrome.storage.local because it's persistent and "offline first"
      const result = await chrome.storage.local.get('tw_local_votes');
      if (result.tw_local_votes) {
        this.votes = result.tw_local_votes;
        this.recalculateWeights();
        logger.info(`Loaded ${this.votes.length} local votes`);
      }
    } catch (e) {
      logger.error('Failed to load local votes', e);
    }
  }

  private async saveVotes() {
    try {
      await chrome.storage.local.set({ 'tw_local_votes': this.votes });
    } catch (e) {
      logger.error('Failed to save local votes', e);
    }
  }

  private recalculateWeights() {
    // Simple Bayesian Update for Category Sensitivity
    // If user marks "wrong" (false positive), decrease sensitivity for that category
    // If user marks "confirm" (true positive), increase sensitivity (or keep same)

    const categoryStats = new Map<string, { confirm: number, wrong: number }>();

    for (const vote of this.votes) {
      if (!categoryStats.has(vote.categoryKey)) {
        categoryStats.set(vote.categoryKey, { confirm: 0, wrong: 0 });
      }
      const stats = categoryStats.get(vote.categoryKey)!;
      if (vote.vote === 'confirm') stats.confirm++;
      else stats.wrong++;
    }

    this.categoryWeights.clear();
    for (const [category, stats] of categoryStats.entries()) {
      const total = stats.confirm + stats.wrong;
      if (total === 0) continue;

      // Calculate a "User Reliability Score" or "Personalized Threshold Adjustment"
      // If user consistently marks things as "Wrong" (False Positive), we should be stricter (higher confidence needed)
      // Base confidence adjustment:
      // > 80% wrong -> +15% threshold
      // > 50% wrong -> +10% threshold

      const wrongRatio = stats.wrong / total;
      let thresholdAdjustment = 0;

      if (wrongRatio > 0.8) thresholdAdjustment = 15;
      else if (wrongRatio > 0.5) thresholdAdjustment = 10;
      else if (wrongRatio > 0.2) thresholdAdjustment = 5;

      this.categoryWeights.set(category, thresholdAdjustment);
    }

    logger.info('Recalculated weights:', Object.fromEntries(this.categoryWeights));
  }

  /**
   * Record a vote locally
   */
  async recordVote(videoId: string, categoryKey: string, timestamp: number, vote: 'confirm' | 'wrong') {
    const newVote: LocalVote = {
      videoId,
      categoryKey,
      timestamp,
      vote,
      createdAt: Date.now()
    };

    // Check for duplicates (same video, category, approx timestamp)
    const duplicateIndex = this.votes.findIndex(v =>
      v.videoId === videoId &&
      v.categoryKey === categoryKey &&
      Math.abs(v.timestamp - timestamp) < 5 // 5 second window
    );

    if (duplicateIndex !== -1) {
      // Update existing
      this.votes[duplicateIndex] = newVote;
    } else {
      this.votes.push(newVote);
    }

    this.recalculateWeights();
    await this.saveVotes();
  }

  /**
   * Get personalized threshold adjustment for a category
   * Returns positive number (increase threshold) or 0
   */
  getThresholdAdjustment(categoryKey: string): number {
    return this.categoryWeights.get(categoryKey) || 0;
  }

  /**
   * Check if user has already voted on this segment
   * Returns vote type or null
   */
  getPreviousVote(videoId: string, categoryKey: string, timestamp: number): 'confirm' | 'wrong' | null {
    const vote = this.votes.find(v =>
      v.videoId === videoId &&
      v.categoryKey === categoryKey &&
      Math.abs(v.timestamp - timestamp) < 10 // 10 second window
    );
    return vote ? vote.vote : null;
  }

  /**
   * Get all local stats
   */
  getStats() {
    let confirm = 0;
    let wrong = 0;
    this.votes.forEach(v => v.vote === 'confirm' ? confirm++ : wrong++);
    return {
      totalVotes: this.votes.length,
      confirm,
      wrong,
      categoryAdjustments: Object.fromEntries(this.categoryWeights)
    };
  }
}
