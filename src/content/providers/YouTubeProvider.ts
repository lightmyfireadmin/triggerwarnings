/**
 * YouTube streaming provider
 */

import { BaseProvider } from './BaseProvider';
import type { MediaInfo } from '@shared/types/Provider.types';

export class YouTubeProvider extends BaseProvider {
  readonly name = 'YouTube';
  readonly domains = ['youtube.com'];

  private videoElement: HTMLVideoElement | null = null;
  private lastSeekTime = 0;

  async initialize(): Promise<void> {
    const video = await this.waitForElement<HTMLVideoElement>('video.html5-main-video');
    if (!video) {
      console.error('YouTube video element not found');
      return;
    }

    this.videoElement = video;
    this.setupVideoListeners();
    this.monitorURLChanges();

    const media = await this.getCurrentMedia();
    if (media) {
      await this.triggerMediaChangeCallbacks(media);
    }
  }

  async getCurrentMedia(): Promise<MediaInfo | null> {
    // YouTube video ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');

    if (!videoId) return null;

    const title = this.extractTitle();

    return {
      id: videoId,
      title: title || `YouTube Video ${videoId}`,
      type: 'movie', // YouTube doesn't have seasons/episodes
    };
  }

  getVideoElement(): HTMLVideoElement | null {
    if (this.videoElement && document.contains(this.videoElement)) {
      return this.videoElement;
    }

    this.videoElement = document.querySelector('video.html5-main-video');
    return this.videoElement;
  }

  getInjectionPoint(): HTMLElement | null {
    return (
      document.querySelector('.html5-video-container') ||
      document.querySelector('#movie_player') ||
      document.body
    );
  }

  private setupVideoListeners(): void {
    const video = this.videoElement;
    if (!video) return;

    this.addEventListener(video, 'play', () => {
      this.triggerPlayCallbacks();
    });

    this.addEventListener(video, 'pause', () => {
      this.triggerPauseCallbacks();
    });

    this.addEventListener(video, 'seeked', () => {
      const currentTime = video.currentTime;
      if (Math.abs(currentTime - this.lastSeekTime) > 1) {
        this.triggerSeekCallbacks(currentTime);
      }
      this.lastSeekTime = currentTime;
    });

    this.addEventListener(video, 'timeupdate', () => {
      this.lastSeekTime = video.currentTime;
    });
  }

  private extractTitle(): string {
    const selectors = [
      'h1.ytd-watch-metadata yt-formatted-string',
      'h1.title.ytd-video-primary-info-renderer',
      '.ytp-title-link',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    const pageTitle = document.title.replace(' - YouTube', '').trim();
    if (pageTitle && pageTitle !== 'YouTube') {
      return pageTitle;
    }

    return '';
  }

  private monitorURLChanges(): void {
    let lastURL = window.location.href;

    const checkURL = setInterval(async () => {
      const currentURL = window.location.href;
      if (currentURL !== lastURL) {
        lastURL = currentURL;

        const media = await this.getCurrentMedia();
        if (media) {
          await this.triggerMediaChangeCallbacks(media);
        }
      }
    }, 1000);

    (this as any)._urlCheckInterval = checkURL;
  }

  override dispose(): void {
    if ((this as any)._urlCheckInterval) {
      clearInterval((this as any)._urlCheckInterval);
      delete (this as any)._urlCheckInterval;
    }

    super.dispose();
  }
}
