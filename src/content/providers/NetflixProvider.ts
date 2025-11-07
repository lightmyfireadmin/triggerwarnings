/**
 * Netflix streaming provider
 */

import { BaseProvider } from './BaseProvider';
import type { MediaInfo } from '@shared/types/Provider.types';

export class NetflixProvider extends BaseProvider {
  readonly name = 'Netflix';
  readonly domains = ['netflix.com'];

  private videoElement: HTMLVideoElement | null = null;
  private lastSeekTime = 0;

  async initialize(): Promise<void> {
    // Wait for video element to load
    const video = await this.waitForElement<HTMLVideoElement>('video');
    if (!video) {
      console.error('Netflix video element not found');
      return;
    }

    this.videoElement = video;

    // Set up video event listeners
    this.setupVideoListeners();

    // Monitor for URL changes (switching episodes)
    this.monitorURLChanges();

    // Get initial media info
    const media = await this.getCurrentMedia();
    if (media) {
      await this.triggerMediaChangeCallbacks(media);
    }
  }

  async getCurrentMedia(): Promise<MediaInfo | null> {
    // Extract video ID from URL
    const match = window.location.pathname.match(/\/watch\/(\d+)/);
    if (!match) return null;

    const videoId = match[1];

    // Try to get title from Netflix's player API
    const title = this.extractTitle();

    return {
      id: videoId,
      title: title || `Netflix Video ${videoId}`,
      type: 'movie', // Netflix doesn't easily expose this in the DOM
    };
  }

  getVideoElement(): HTMLVideoElement | null {
    if (this.videoElement && document.contains(this.videoElement)) {
      return this.videoElement;
    }

    // Try to find video element
    this.videoElement = document.querySelector('video');
    return this.videoElement;
  }

  getInjectionPoint(): HTMLElement | null {
    // Netflix player container
    return (
      document.querySelector('.watch-video') ||
      document.querySelector('.NFPlayer') ||
      document.body
    );
  }

  private setupVideoListeners(): void {
    const video = this.videoElement;
    if (!video) return;

    // Play event
    this.addEventListener(video, 'play', () => {
      this.triggerPlayCallbacks();
    });

    // Pause event
    this.addEventListener(video, 'pause', () => {
      this.triggerPauseCallbacks();
    });

    // Seek event
    this.addEventListener(video, 'seeked', () => {
      const currentTime = video.currentTime;
      const timeDiff = Math.abs(currentTime - this.lastSeekTime);

      // Only trigger if seek was significant (> 1 second)
      if (timeDiff > 1) {
        this.triggerSeekCallbacks(currentTime);
      }

      this.lastSeekTime = currentTime;
    });

    // Time update for tracking
    this.addEventListener(video, 'timeupdate', () => {
      this.lastSeekTime = video.currentTime;
    });
  }

  private extractTitle(): string {
    // Try multiple selectors for Netflix title
    const titleSelectors = [
      '.video-title h4',
      '.ellipsize-text h4',
      '[data-uia="video-title"]',
      '.title-logo',
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    // Fallback to page title
    const pageTitle = document.title.replace(' - Netflix', '').trim();
    if (pageTitle && pageTitle !== 'Netflix') {
      return pageTitle;
    }

    return '';
  }

  private monitorURLChanges(): void {
    let lastURL = window.location.href;

    // Use MutationObserver to detect URL changes
    this.observeDOM(document.body, {
      childList: true,
      subtree: true,
    });

    // Also use interval as fallback
    const checkURL = setInterval(async () => {
      const currentURL = window.location.href;
      if (currentURL !== lastURL) {
        lastURL = currentURL;

        // URL changed, get new media info
        const media = await this.getCurrentMedia();
        if (media) {
          await this.triggerMediaChangeCallbacks(media);
        }
      }
    }, 1000);

    // Store interval for cleanup
    (this as any)._urlCheckInterval = checkURL;
  }

  protected override handleDOMMutations(_mutations: MutationRecord[]): void {
    // Check if video element changed
    const currentVideo = document.querySelector('video');
    if (currentVideo !== this.videoElement) {
      this.videoElement = currentVideo as HTMLVideoElement;
      if (this.videoElement) {
        this.setupVideoListeners();
      }
    }
  }

  override dispose(): void {
    // Clear URL check interval
    if ((this as any)._urlCheckInterval) {
      clearInterval((this as any)._urlCheckInterval);
      delete (this as any)._urlCheckInterval;
    }

    super.dispose();
  }
}
