import { Logger } from '@shared/utils/logger';

const logger = new Logger('PerformanceGovernor');

export enum PerformanceTier {
  OPTIMAL = 'optimal',   // Full capabilities (60fps analysis)
  BALANCED = 'balanced', // Standard capabilities (30fps analysis)
  STRESSED = 'stressed', // Reduced capabilities (15fps analysis)
  CRITICAL = 'critical'  // Minimal capabilities (5fps or paused)
}

interface PerformanceMetrics {
  fps: number;
  frameTime: number; // ms
  longTasks: number;
  memoryUsage?: number; // MB (if available)
}

export class PerformanceGovernor {
  private static instance: PerformanceGovernor;
  private currentTier: PerformanceTier = PerformanceTier.OPTIMAL;
  private listeners: ((tier: PerformanceTier) => void)[] = [];

  // Monitoring state
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private lastCheckTime: number = 0;
  private checkInterval: number = 2000; // Check every 2 seconds
  private rafId: number | null = null;
  private isMonitoring: boolean = false;

  // Performance thresholds
  private readonly THRESHOLDS = {
    OPTIMAL: 55, // fps > 55
    BALANCED: 45, // fps > 45
    STRESSED: 30  // fps > 30
  };

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): PerformanceGovernor {
    if (!PerformanceGovernor.instance) {
      PerformanceGovernor.instance = new PerformanceGovernor();
    }
    return PerformanceGovernor.instance;
  }

  /**
   * Start monitoring performance
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastCheckTime = performance.now();
    this.frameCount = 0;

    logger.info('Performance monitoring started');
    this.monitorLoop();
  }

  /**
   * Stop monitoring performance
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    logger.info('Performance monitoring stopped');
  }

  /**
   * Get current performance tier
   */
  public getTier(): PerformanceTier {
    return this.currentTier;
  }

  /**
   * Subscribe to tier changes
   */
  public subscribe(callback: (tier: PerformanceTier) => void): () => void {
    this.listeners.push(callback);
    // Immediately callback with current tier
    callback(this.currentTier);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Main monitoring loop
   */
  private monitorLoop(): void {
    if (!this.isMonitoring) return;

    const now = performance.now();
    this.frameCount++;

    if (now - this.lastCheckTime >= this.checkInterval) {
      this.evaluatePerformance(now);
    }

    this.rafId = requestAnimationFrame(() => this.monitorLoop());
  }

  /**
   * Evaluate performance and update tier
   */
  private evaluatePerformance(now: number): void {
    const elapsed = now - this.lastCheckTime;
    const fps = (this.frameCount / elapsed) * 1000;

    const previousTier = this.currentTier;

    // Determine new tier
    if (fps >= this.THRESHOLDS.OPTIMAL) {
      this.currentTier = PerformanceTier.OPTIMAL;
    } else if (fps >= this.THRESHOLDS.BALANCED) {
      this.currentTier = PerformanceTier.BALANCED;
    } else if (fps >= this.THRESHOLDS.STRESSED) {
      this.currentTier = PerformanceTier.STRESSED;
    } else {
      this.currentTier = PerformanceTier.CRITICAL;
    }

    // Log if tier changed
    if (previousTier !== this.currentTier) {
      logger.info(`Performance tier changed: ${previousTier} -> ${this.currentTier} (FPS: ${fps.toFixed(1)})`);
      this.notifyListeners();
    }

    // Reset counters
    this.lastCheckTime = now;
    this.frameCount = 0;
  }

  /**
   * Notify all listeners of tier change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentTier);
      } catch (error) {
        logger.error('Error in performance listener:', error);
      }
    });
  }

  /**
   * Get recommended sampling interval based on current tier
   * @returns interval in ms
   */
  public getRecommendedInterval(baseInterval: number): number {
    switch (this.currentTier) {
      case PerformanceTier.OPTIMAL:
        return baseInterval;
      case PerformanceTier.BALANCED:
        return baseInterval * 1.5;
      case PerformanceTier.STRESSED:
        return baseInterval * 3;
      case PerformanceTier.CRITICAL:
        return baseInterval * 6;
      default:
        return baseInterval;
    }
  }
}
