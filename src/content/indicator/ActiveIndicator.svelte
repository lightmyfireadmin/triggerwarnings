<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';

  // Props
  export let buttonColor: string = '#8b5cf6';
  export let buttonOpacity: number = 0.45;
  export let appearingMode: 'always' | 'hover' = 'always';
  export let fadeOutDelay: number = 3000;

  // Initialize as visible so we can see it immediately upon injection
  let isVisible = true;
  let isHovered = false;
  let activityTimeout: ReturnType<typeof setTimeout>;

  // Function to show the indicator
  function show() {
    isVisible = true;
  }

  // Function to hide (only if not hovered)
  function hide() {
    if (!isHovered) {
      isVisible = false;
    }
  }

  function resetActivityTimer() {
    // Clear existing timer
    if (activityTimeout) clearTimeout(activityTimeout);

    // Set new timer to hide after delay
    activityTimeout = setTimeout(() => {
      hide();
    }, fadeOutDelay);
  }

  function handleActivity() {
    if (appearingMode === 'always') {
      show();
      resetActivityTimer();
    }
  }

  function handleMouseEnter() {
    isHovered = true;
    show();
    if (activityTimeout) clearTimeout(activityTimeout);
  }

  function handleMouseLeave() {
    isHovered = false;
    resetActivityTimer();
  }

  onMount(() => {
    // Log to confirm mounting
    console.log('[TW] ActiveIndicator component mounted');

    // Attach listeners to window to catch events more broadly
    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });

    // Initial trigger
    handleActivity();
  });

  onDestroy(() => {
    window.removeEventListener('mousemove', handleActivity);
    window.removeEventListener('keydown', handleActivity);
    window.removeEventListener('scroll', handleActivity);
    if (activityTimeout) clearTimeout(activityTimeout);
  });
</script>

{#if isVisible}
  <div
    class="tw-indicator-root"
    transition:fade={{ duration: 200 }}
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
    style="--tw-indicator-opacity: {isHovered
      ? 1
      : buttonOpacity}; --tw-indicator-color: {buttonColor};"
    role="status"
    aria-label="Trigger Warnings Active"
  >
    <div class="indicator-dot"></div>
    <span class="indicator-text">TW Active</span>
  </div>
{/if}

<style>
  .tw-indicator-root {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: rgba(0, 0, 0, 0.6);
    border-radius: 20px;
    color: white;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    font-size: 12px;
    font-weight: 500;
    pointer-events: auto;
    cursor: default;
    opacity: var(--tw-indicator-opacity);
    transition: opacity 0.3s ease;
    /* Ensure z-index is high enough to sit above YouTube player controls */
    z-index: 2147483647;
    user-select: none;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    /* Add a subtle text shadow for better readability on mixed backgrounds */
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .indicator-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--tw-indicator-color);
    box-shadow: 0 0 8px var(--tw-indicator-color);
    animation: pulse 2s infinite;
  }

  .indicator-text {
    opacity: 0.9;
  }

  @keyframes pulse {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(0.95);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
