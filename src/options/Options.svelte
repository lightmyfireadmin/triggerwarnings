<script lang="ts">
  import { onMount } from 'svelte';
  import browser from 'webextension-polyfill';
  import type { Profile, BannerPosition, Theme } from '@shared/types/Profile.types';
  import { TRIGGER_CATEGORIES, CATEGORY_KEYS } from '@shared/constants/categories';
  import ToastContainer from '@shared/components/ToastContainer.svelte';
  import Stats from './components/Stats.svelte';
  import { toast } from '@shared/utils/toast';

  let activeProfile: Profile | null = null;
  let allProfiles: Profile[] = [];
  let loading = true;
  let saving = false;
  let activeTab: 'categories' | 'settings' | 'stats' = 'categories';

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    // Failsafe: Force loading to false after 5 seconds
    const failsafeTimer = setTimeout(() => {
      if (loading) {
        console.warn('Options: Load timeout failsafe triggered');
        loading = false;
        toast.error('Loading timed out - showing default view');
      }
    }, 5000);

    try {
      loading = true;

      // Add timeout to requests
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 2000)
      );

      const activeResponse = (await Promise.race([
        browser.runtime.sendMessage({ type: 'GET_ACTIVE_PROFILE' }),
        timeoutPromise,
      ])) as any;

      if (activeResponse && activeResponse.success) {
        activeProfile = activeResponse.data;
      }

      const profilesResponse = (await Promise.race([
        browser.runtime.sendMessage({ type: 'GET_ALL_PROFILES' }),
        timeoutPromise,
      ])) as any;

      if (profilesResponse && profilesResponse.success) {
        allProfiles = profilesResponse.data;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load settings');
    } finally {
      clearTimeout(failsafeTimer);
      loading = false;
    }
  }

  async function toggleCategory(categoryKey: string) {
    if (!activeProfile) return;

    const isEnabled = activeProfile.enabledCategories.includes(categoryKey as any);
    const newCategories = isEnabled
      ? activeProfile.enabledCategories.filter((k) => k !== categoryKey)
      : [...activeProfile.enabledCategories, categoryKey as any];

    // Optimistic UI update - update immediately for instant feedback
    const previousCategories = activeProfile.enabledCategories;
    activeProfile = {
      ...activeProfile,
      enabledCategories: newCategories,
    };

    // Force re-render by reassigning
    activeProfile = activeProfile;

    // Update in background without waiting
    updateProfileSilent({
      enabledCategories: newCategories,
    }).catch(() => {
      // Rollback on error
      activeProfile = activeProfile
        ? {
            ...activeProfile,
            enabledCategories: previousCategories,
          }
        : null;
      toast.error('Failed to update category');
    });
  }

  async function updateProfile(updates: any) {
    if (!activeProfile) return;

    try {
      saving = true;

      const response = await browser.runtime.sendMessage({
        type: 'UPDATE_PROFILE',
        profileId: activeProfile.id,
        updates,
      });

      if (response.success) {
        activeProfile = response.data;
        toast.success('Settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to save settings');
    } finally {
      saving = false;
    }
  }

  async function updateProfileSilent(updates: any) {
    if (!activeProfile) return;

    const response = await browser.runtime.sendMessage({
      type: 'UPDATE_PROFILE',
      profileId: activeProfile.id,
      updates,
    });

    if (!response.success) {
      throw new Error('Failed to save settings');
    }
  }

  async function updateDisplay(key: string, value: any) {
    if (!activeProfile) return;
    await updateProfile({
      display: {
        ...activeProfile.display,
        [key]: value,
      },
    });
  }

  async function updateTheme(theme: Theme) {
    await updateProfile({ theme });
  }

  async function updateLeadTime(time: number) {
    await updateProfile({ leadTime: time });
  }

  async function toggleSound() {
    if (!activeProfile) return;
    await updateProfile({ soundEnabled: !activeProfile.soundEnabled });
  }

  async function updateDefaultProtection(protection: string) {
    await updateProfile({ defaultProtection: protection });
  }

  async function updateCategoryProtection(categoryKey: string, protection: string | null) {
    if (!activeProfile) return;

    const newProtections = { ...activeProfile.categoryProtections };
    if (protection === null) {
      delete newProtections[categoryKey];
    } else {
      newProtections[categoryKey] = protection;
    }

    await updateProfile({ categoryProtections: newProtections });
  }

  async function updateHelperMode(enabled: boolean) {
    await updateProfile({ helperMode: enabled });
  }

  async function switchProfile(profileId: string) {
    try {
      await browser.runtime.sendMessage({
        type: 'SET_ACTIVE_PROFILE',
        profileId,
      });

      await loadData();
    } catch (error) {
      console.error('Error switching profile:', error);
    }
  }

  function isCategoryEnabled(categoryKey: string): boolean {
    return activeProfile?.enabledCategories.includes(categoryKey as any) ?? false;
  }
</script>

<div class="options">
  <header class="options-header">
    <div class="container">
      <div class="header-content">
        <h1 class="header-title">
          <span class="header-icon">⚠️</span>
          Trigger Warnings Settings
        </h1>
        {#if saving}
          <span class="saving-indicator">Saving...</span>
        {/if}
      </div>
    </div>
  </header>

  <div class="container">
    {#if loading}
      <div class="loading">Loading settings...</div>
    {:else if activeProfile}
      <div class="options-content">
        <!-- Profile Selector -->
        <section class="section">
          <h2 class="section-title">Active Profile</h2>
          <p class="section-description">
            📋 <strong>What are profiles?</strong> Profiles let you create different trigger warning
            configurations for different situations. For example, you might want stricter warnings when
            watching alone versus with friends, or different settings for different family members.
          </p>
          <div class="profile-selector">
            {#each allProfiles as profile}
              <button
                class="profile-btn"
                class:active={profile.id === activeProfile.id}
                on:click={() => switchProfile(profile.id)}
              >
                <div class="profile-btn-content">
                  <div class="profile-btn-name">{profile.name}</div>
                  <div class="profile-btn-stats">
                    {profile.enabledCategories.length} categories enabled
                  </div>
                </div>
                {#if profile.id === activeProfile.id}
                  <div class="profile-btn-badge">✓ Active</div>
                {/if}
              </button>
            {/each}
          </div>
        </section>

        <!-- Tabs -->
        <nav class="tabs">
          <button
            class="tab"
            class:active={activeTab === 'categories'}
            on:click={() => (activeTab = 'categories')}
          >
            Categories
          </button>
          <button
            class="tab"
            class:active={activeTab === 'settings'}
            on:click={() => (activeTab = 'settings')}
          >
            Settings
          </button>
          <button
            class="tab"
            class:active={activeTab === 'stats'}
            on:click={() => (activeTab = 'stats')}
          >
            Stats
          </button>
        </nav>

        <!-- Categories Tab -->
        {#if activeTab === 'categories'}
          <section class="section">
            <h2 class="section-title">Trigger Warning Categories</h2>
            <p class="section-description">
              Select which trigger warnings you want to see. Click on any category to enable or
              disable it.
            </p>

            <div class="categories-grid">
              {#each CATEGORY_KEYS as categoryKey}
                {@const category = TRIGGER_CATEGORIES[categoryKey]}
                {@const enabled = isCategoryEnabled(categoryKey)}
                <button
                  class="category-card"
                  class:enabled
                  on:click={() => toggleCategory(categoryKey)}
                >
                  <div class="category-icon">{category.icon}</div>
                  <div class="category-info">
                    <div class="category-name">{category.name}</div>
                    <div class="category-severity severity-{category.severity}">
                      {category.severity}
                    </div>
                  </div>
                  <div class="category-toggle">
                    {#if enabled}
                      ✓
                    {/if}
                  </div>
                </button>
              {/each}
            </div>

            <!-- Info -->
            <div class="info-box" style="margin-top: 32px;">
              <h3>How It Works</h3>
              <ul>
                <li>Enable the categories you want to be warned about</li>
                <li>Warnings will appear when watching content on supported platforms</li>
                <li>You can vote on warning accuracy to improve the community database</li>
                <li>Create multiple profiles for different viewing situations</li>
              </ul>
            </div>
          </section>
        {/if}

        <!-- Settings Tab -->
        {#if activeTab === 'settings'}
          <section class="section">
            <h2 class="section-title">Banner Appearance</h2>

            <!-- Position -->
            <div class="setting-group">
              <div class="setting-label" role="heading" aria-level="3">Banner Position</div>
              <div class="position-grid" role="group" aria-label="Banner Position">
                <button
                  class="position-btn"
                  class:active={activeProfile.display.position === 'top-left'}
                  on:click={() => updateDisplay('position', 'top-left')}
                >
                  <div class="position-preview top-left"></div>
                  Top Left
                </button>
                <button
                  class="position-btn"
                  class:active={activeProfile.display.position === 'top-right'}
                  on:click={() => updateDisplay('position', 'top-right')}
                >
                  <div class="position-preview top-right"></div>
                  Top Right
                </button>
                <button
                  class="position-btn"
                  class:active={activeProfile.display.position === 'bottom-left'}
                  on:click={() => updateDisplay('position', 'bottom-left')}
                >
                  <div class="position-preview bottom-left"></div>
                  Bottom Left
                </button>
                <button
                  class="position-btn"
                  class:active={activeProfile.display.position === 'bottom-right'}
                  on:click={() => updateDisplay('position', 'bottom-right')}
                >
                  <div class="position-preview bottom-right"></div>
                  Bottom Right
                </button>
              </div>
            </div>

            <!-- Font Size -->
            <div class="setting-group">
              <div class="setting-label" role="heading" aria-level="3">
                Font Size: {activeProfile.display.fontSize}px
              </div>
              <input
                type="range"
                min="12"
                max="24"
                value={activeProfile.display.fontSize}
                on:input={(e) => updateDisplay('fontSize', Number(e.currentTarget.value))}
                class="slider"
              />
            </div>

            <!-- Transparency -->
            <div class="setting-group">
              <div class="setting-label" role="heading" aria-level="3">
                Transparency: {activeProfile.display.transparency}%
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={activeProfile.display.transparency}
                on:input={(e) => updateDisplay('transparency', Number(e.currentTarget.value))}
                class="slider"
              />
            </div>

            <!-- Spoiler-Free Mode -->
            <div class="setting-group">
              <label class="setting-checkbox">
                <input
                  type="checkbox"
                  checked={activeProfile.display.spoilerFreeMode}
                  on:change={(e) => updateDisplay('spoilerFreeMode', e.currentTarget.checked)}
                />
                <span>Spoiler-Free Mode (hide specific timing details)</span>
              </label>
            </div>

            <h2 class="section-title" style="margin-top: 48px;">Behavior Settings</h2>

            <!-- Lead Time -->
            <div class="setting-group">
              <div class="setting-label" role="heading" aria-level="3">
                Warning Lead Time: {activeProfile.leadTime} seconds
              </div>
              <p class="setting-hint">How early before the trigger to show the warning</p>
              <input
                type="range"
                min="5"
                max="60"
                value={activeProfile.leadTime}
                on:input={(e) => updateLeadTime(Number(e.currentTarget.value))}
                class="slider"
              />
            </div>

            <!-- Sound -->
            <div class="setting-group">
              <label class="setting-checkbox">
                <input
                  type="checkbox"
                  checked={activeProfile.soundEnabled}
                  on:change={toggleSound}
                />
                <span>Sound Alerts</span>
              </label>
            </div>

            <!-- Theme -->
            <div class="setting-group">
              <div class="setting-label" role="heading" aria-level="3">Theme</div>
              <div class="theme-selector" role="group" aria-label="Theme Selection">
                <button
                  class="theme-btn"
                  class:active={activeProfile.theme === 'light'}
                  on:click={() => updateTheme('light')}
                >
                  ☀️ Light
                </button>
                <button
                  class="theme-btn"
                  class:active={activeProfile.theme === 'dark'}
                  on:click={() => updateTheme('dark')}
                >
                  🌙 Dark
                </button>
                <button
                  class="theme-btn"
                  class:active={activeProfile.theme === 'system'}
                  on:click={() => updateTheme('system')}
                >
                  💻 System
                </button>
              </div>
            </div>

            <h2 class="section-title" style="margin-top: 48px;">🎨 Overlay Customization</h2>
            <p class="section-description">
              Customize the "TW" overlay button appearance and behavior
            </p>

            <!-- Overlay Button Color -->
            <div class="setting-group">
              <div class="setting-label" role="heading" aria-level="3">Button Color</div>
              <input
                type="color"
                value={activeProfile.display.overlaySettings?.buttonColor || '#8b5cf6'}
                on:change={(e) =>
                  updateDisplay('overlaySettings', {
                    ...(activeProfile.display.overlaySettings || {}),
                    buttonColor: e.currentTarget.value,
                  })}
                class="color-picker"
              />
            </div>

            <!-- Overlay Opacity -->
            <div class="setting-group">
              <div class="setting-label" role="heading" aria-level="3">
                Overlay Opacity: {Math.round(
                  (activeProfile.display.overlaySettings?.buttonOpacity || 0.45) * 100
                )}%
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={activeProfile.display.overlaySettings?.buttonOpacity || 0.45}
                on:input={(e) =>
                  updateDisplay('overlaySettings', {
                    ...(activeProfile.display.overlaySettings || {}),
                    buttonOpacity: Number(e.currentTarget.value),
                  })}
                class="slider"
              />
            </div>

            <h2 class="section-title" style="margin-top: 48px;">🤝 Helper Mode</h2>
            <p class="section-description">
              Enable Helper Mode to help improve warning accuracy for the entire community. When
              enabled, you'll see "Confirm" and "Wrong" buttons on active warnings, allowing you to
              vote on their accuracy.
            </p>

            <!-- Helper Mode Toggle -->
            <div class="setting-group">
              <button
                class="helper-mode-toggle"
                class:active={activeProfile.helperMode}
                on:click={() => updateHelperMode(!activeProfile.helperMode)}
              >
                <div class="helper-mode-content">
                  <div class="helper-mode-header">
                    <span class="helper-mode-icon">{activeProfile.helperMode ? '✅' : '⬜'}</span>
                    <span class="helper-mode-label">Helper Mode</span>
                    <span class="helper-mode-status"
                      >{activeProfile.helperMode ? 'Enabled' : 'Disabled'}</span
                    >
                  </div>
                  <div class="helper-mode-description">
                    {#if activeProfile.helperMode}
                      <span class="helper-mode-desc-text"
                        >You're helping build a safer community! Vote on warnings to improve
                        accuracy.</span
                      >
                    {:else}
                      <span class="helper-mode-desc-text"
                        >Enable to show voting buttons on warnings and contribute to the community
                        database.</span
                      >
                    {/if}
                  </div>
                </div>
              </button>
            </div>

            <div class="info-box" style="margin-top: 16px;">
              <strong>How it works:</strong> When Helper Mode is enabled, active warnings will show "Confirm
              ✓" and "Wrong ✕" buttons. Your votes help verify warning accuracy and improve the experience
              for all users. High-quality voters gain reputation, making their votes more impactful.
            </div>

            <h2 class="section-title" style="margin-top: 48px;">🛡️ Protection Settings</h2>
            <p class="section-description">
              Choose what happens during active trigger warnings (after the lead time has passed)
            </p>

            <!-- Default Protection -->
            <div class="setting-group">
              <div class="setting-label" role="heading" aria-level="3">Default Protection</div>
              <p class="setting-hint">
                This will apply to all triggers unless you set a category-specific override below
              </p>
              <div class="protection-selector" role="group" aria-label="Default Protection Mode">
                <button
                  class="protection-btn"
                  class:active={activeProfile.defaultProtection === 'none'}
                  on:click={() => updateDefaultProtection('none')}
                >
                  <div class="protection-icon">👁️</div>
                  <div class="protection-info">
                    <div class="protection-name">None</div>
                    <div class="protection-desc">Show warning banner only</div>
                  </div>
                </button>
                <button
                  class="protection-btn"
                  class:active={activeProfile.defaultProtection === 'blackout'}
                  on:click={() => updateDefaultProtection('blackout')}
                >
                  <div class="protection-icon">⬛</div>
                  <div class="protection-info">
                    <div class="protection-name">Blackout</div>
                    <div class="protection-desc">Hide video content</div>
                  </div>
                </button>
                <button
                  class="protection-btn"
                  class:active={activeProfile.defaultProtection === 'mute'}
                  on:click={() => updateDefaultProtection('mute')}
                >
                  <div class="protection-icon">🔇</div>
                  <div class="protection-info">
                    <div class="protection-name">Mute</div>
                    <div class="protection-desc">Mute audio only</div>
                  </div>
                </button>
                <button
                  class="protection-btn"
                  class:active={activeProfile.defaultProtection === 'both'}
                  on:click={() => updateDefaultProtection('both')}
                >
                  <div class="protection-icon">🛡️</div>
                  <div class="protection-info">
                    <div class="protection-name">Both</div>
                    <div class="protection-desc">Blackout + mute</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Category-Specific Protections -->
            <details class="advanced-section" style="margin-top: 24px;">
              <summary class="advanced-summary">
                <span class="advanced-title">⚙️ Per-Category Overrides</span>
                <span class="advanced-hint">(Optional)</span>
              </summary>
              <div class="advanced-content">
                <p class="section-description">
                  Set different protection levels for specific categories. Leave as "Use Default" to
                  use the default protection setting above.
                </p>
                <div class="category-protections">
                  {#each CATEGORY_KEYS as categoryKey}
                    {@const category = TRIGGER_CATEGORIES[categoryKey]}
                    {@const enabled = isCategoryEnabled(categoryKey)}
                    {#if enabled}
                      {@const currentProtection =
                        activeProfile.categoryProtections?.[categoryKey] || null}
                      <div class="category-protection-item">
                        <div class="category-protection-header">
                          <span class="category-protection-icon">{category.icon}</span>
                          <span class="category-protection-name">{category.name}</span>
                        </div>
                        <select
                          class="protection-select"
                          value={currentProtection || 'default'}
                          on:change={(e) => {
                            const value = e.currentTarget.value;
                            updateCategoryProtection(
                              categoryKey,
                              value === 'default' ? null : value
                            );
                          }}
                        >
                          <option value="default">Use Default</option>
                          <option value="none">None (Warning only)</option>
                          <option value="blackout">Blackout</option>
                          <option value="mute">Mute</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                    {/if}
                  {/each}
                </div>
              </div>
            </details>
          </section>
        {/if}

        <!-- Stats Tab -->
        {#if activeTab === 'stats'}
          <section class="section">
            <h2 class="section-title">Community Statistics</h2>
            <Stats />
          </section>
        {/if}
      </div>
    {:else}
      <div class="error">Failed to load settings</div>
    {/if}
  </div>

  <ToastContainer />
</div>

<style>
  .options {
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }

  .options-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 48px 0;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    position: relative;
    overflow: hidden;
  }

  .options-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)" /></svg>');
    opacity: 0.3;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  .header-title {
    margin: 0;
    font-size: 36px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 20px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    letter-spacing: -0.5px;
  }

  .header-icon {
    font-size: 48px;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
    animation: iconBounce 2s ease-in-out infinite;
  }

  @keyframes iconBounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  .saving-indicator {
    font-size: 14px;
    opacity: 0.9;
  }

  .options-content {
    padding: 40px 0;
  }

  .section {
    margin-bottom: 48px;
  }

  .section-title {
    font-size: 26px;
    font-weight: 700;
    color: #2d3748;
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .section-title::before {
    content: '';
    width: 4px;
    height: 28px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 2px;
  }

  .section-description {
    color: #718096;
    margin: 0 0 28px 0;
    line-height: 1.6;
    font-size: 15px;
  }

  .profile-selector {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .profile-btn {
    padding: 20px 24px;
    border: 2px solid #e2e8f0;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    overflow: hidden;
  }

  .profile-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    transform: scaleY(0);
    transition: transform 0.3s ease;
  }

  .profile-btn:hover::before,
  .profile-btn.active::before {
    transform: scaleY(1);
  }

  .profile-btn:hover {
    border-color: #667eea;
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);
  }

  .profile-btn.active {
    border-color: #667eea;
    background: linear-gradient(
      135deg,
      rgba(102, 126, 234, 0.12) 0%,
      rgba(118, 75, 162, 0.12) 100%
    );
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.25);
  }

  .profile-btn-content {
    flex: 1;
  }

  .profile-btn-name {
    font-weight: 700;
    color: #2d3748;
    margin-bottom: 6px;
    font-size: 16px;
  }

  .profile-btn-stats {
    font-size: 13px;
    color: #718096;
    font-weight: 500;
  }

  .profile-btn-badge {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }

  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .category-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border: 2px solid #dee2e6;
    border-radius: 12px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .category-card:hover {
    border-color: #adb5bd;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .category-card.enabled {
    border-color: #667eea;
    border-width: 3px;
    background: linear-gradient(
      135deg,
      rgba(102, 126, 234, 0.15) 0%,
      rgba(118, 75, 162, 0.15) 100%
    );
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    transform: translateY(-2px);
    animation: enablePulse 0.3s ease-out;
  }

  @keyframes enablePulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: translateY(-2px) scale(1);
    }
  }

  .category-card.enabled .category-name {
    color: #667eea;
    font-weight: 700;
  }

  .category-icon {
    font-size: 32px;
    flex-shrink: 0;
  }

  .category-info {
    flex: 1;
  }

  .category-name {
    font-weight: 600;
    color: #212529;
    margin-bottom: 4px;
  }

  .category-severity {
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 4px;
    display: inline-block;
  }

  .severity-high {
    background: #fee;
    color: #c00;
  }

  .severity-medium {
    background: #ffeaa7;
    color: #d63031;
  }

  .severity-low {
    background: #dfe6e9;
    color: #2d3436;
  }

  .category-toggle {
    width: 28px;
    height: 28px;
    border: 2px solid #dee2e6;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 16px;
    color: #667eea;
    flex-shrink: 0;
    transition: all 0.2s ease;
  }

  .category-card.enabled .category-toggle {
    border-color: #667eea;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    animation: checkmarkAppear 0.3s ease-out;
  }

  @keyframes checkmarkAppear {
    0% {
      transform: scale(0) rotate(-45deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.2) rotate(0deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }

  .helper-mode-toggle {
    width: 100%;
    background: white;
    border: 3px solid #dee2e6;
    border-radius: 16px;
    padding: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
  }

  .helper-mode-toggle:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
  }

  .helper-mode-toggle.active {
    border-color: #667eea;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
  }

  .helper-mode-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .helper-mode-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .helper-mode-icon {
    font-size: 24px;
  }

  .helper-mode-label {
    font-size: 18px;
    font-weight: 700;
    color: #212529;
    flex: 1;
  }

  .helper-mode-status {
    font-size: 14px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 12px;
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
  }

  .helper-mode-toggle.active .helper-mode-status {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .helper-mode-description {
    font-size: 14px;
    line-height: 1.6;
    color: #6c757d;
  }

  .helper-mode-desc-text {
    font-style: italic;
  }

  .helper-mode-toggle.active .helper-mode-desc-text {
    color: #495057;
    font-weight: 500;
  }

  .info-box {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(102, 126, 234, 0.2);
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }

  .info-box h3 {
    margin: 0 0 20px 0;
    color: #2d3748;
    font-size: 20px;
    font-weight: 700;
  }

  .info-box ul {
    margin: 0;
    padding-left: 24px;
    color: #4a5568;
    line-height: 2;
    font-size: 15px;
  }

  .info-box ul li {
    margin-bottom: 8px;
  }

  .loading,
  .error {
    padding: 60px 20px;
    text-align: center;
    color: #6c757d;
  }

  .error {
    color: #dc3545;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 32px;
    border-bottom: 2px solid #dee2e6;
  }

  .tab {
    padding: 12px 24px;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    color: #6c757d;
    transition: all 0.2s;
    margin-bottom: -2px;
  }

  .tab:hover {
    color: #667eea;
  }

  .tab.active {
    color: #667eea;
    border-bottom-color: #667eea;
  }

  /* Settings */
  .setting-group {
    margin-bottom: 32px;
  }

  .setting-label {
    display: block;
    font-weight: 600;
    color: #212529;
    margin-bottom: 12px;
    font-size: 16px;
  }

  .setting-hint {
    color: #6c757d;
    font-size: 14px;
    margin: 4px 0 12px 0;
  }

  .setting-checkbox {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    padding: 16px;
    background: white;
    border: 2px solid #dee2e6;
    border-radius: 12px;
    transition: border-color 0.2s;
  }

  .setting-checkbox:hover {
    border-color: #667eea;
  }

  .setting-checkbox input[type='checkbox'] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
    border: 2px solid #dee2e6;
    border-radius: 4px;
    background: white;
    position: relative;
    transition: all 0.2s;
  }

  .setting-checkbox input[type='checkbox']:checked {
    background: #667eea;
    border-color: #667eea;
  }

  .setting-checkbox input[type='checkbox']:checked::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 14px;
    font-weight: bold;
  }

  .setting-checkbox input[type='checkbox']:hover {
    border-color: #667eea;
  }

  .setting-checkbox input[type='checkbox']:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
  }

  .setting-checkbox span {
    font-size: 16px;
    color: #212529;
  }

  .slider {
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: #dee2e6;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
    transition: transform 0.2s;
  }

  .slider::-moz-range-thumb:hover {
    transform: scale(1.2);
  }

  /* Position Selector */
  .position-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .position-btn {
    padding: 20px;
    border: 2px solid #dee2e6;
    border-radius: 12px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    font-weight: 500;
    color: #6c757d;
  }

  .position-btn:hover {
    border-color: #667eea;
    transform: translateY(-2px);
  }

  .position-btn.active {
    border-color: #667eea;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    color: #667eea;
  }

  .position-preview {
    width: 80px;
    height: 60px;
    border: 2px solid #dee2e6;
    border-radius: 8px;
    position: relative;
  }

  .position-preview::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 12px;
    background: #667eea;
    border-radius: 2px;
  }

  .position-preview.top-left::after {
    top: 6px;
    left: 6px;
  }

  .position-preview.top-right::after {
    top: 6px;
    right: 6px;
  }

  .position-preview.bottom-left::after {
    bottom: 6px;
    left: 6px;
  }

  .position-preview.bottom-right::after {
    bottom: 6px;
    right: 6px;
  }

  /* Theme Selector */
  .theme-selector {
    display: flex;
    gap: 12px;
  }

  .theme-btn {
    flex: 1;
    padding: 16px;
    border: 2px solid #dee2e6;
    border-radius: 12px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 16px;
    font-weight: 500;
    color: #6c757d;
  }

  .theme-btn:hover {
    border-color: #667eea;
    transform: translateY(-2px);
  }

  .theme-btn.active {
    border-color: #667eea;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    color: #667eea;
  }

  /* Protection Selector */
  .protection-selector {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-top: 12px;
  }

  .protection-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 2px solid #dee2e6;
    border-radius: 12px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .protection-btn:hover {
    border-color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  }

  .protection-btn.active {
    border-color: #667eea;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  }

  .protection-icon {
    font-size: 24px;
    line-height: 1;
  }

  .protection-info {
    flex: 1;
  }

  .protection-name {
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 4px;
  }

  .protection-desc {
    font-size: 13px;
    color: #6c757d;
  }

  /* Advanced Section */
  .advanced-section {
    border: 2px solid #e9ecef;
    border-radius: 12px;
    padding: 0;
    background: white;
  }

  .advanced-summary {
    padding: 16px 20px;
    cursor: pointer;
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
    font-weight: 500;
    color: #495057;
  }

  .advanced-summary::-webkit-details-marker {
    display: none;
  }

  .advanced-summary::before {
    content: '▶';
    margin-right: 8px;
    transition: transform 0.2s;
  }

  .advanced-section[open] .advanced-summary::before {
    transform: rotate(90deg);
  }

  .advanced-title {
    font-size: 16px;
  }

  .advanced-hint {
    font-size: 13px;
    color: #6c757d;
    font-weight: normal;
  }

  .advanced-content {
    padding: 0 20px 20px;
    border-top: 1px solid #e9ecef;
  }

  /* Category Protections */
  .category-protections {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
  }

  .category-protection-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 8px;
    gap: 16px;
  }

  .category-protection-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }

  .category-protection-icon {
    font-size: 20px;
    line-height: 1;
  }

  .category-protection-name {
    font-weight: 500;
    color: #2d3748;
  }

  .protection-select {
    padding: 8px 12px;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 14px;
    color: #495057;
    transition: border-color 0.2s;
    min-width: 160px;
  }

  .protection-select:hover {
    border-color: #667eea;
  }

  .protection-select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .protection-selector {
      grid-template-columns: 1fr;
    }

    .category-protection-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .protection-select {
      width: 100%;
    }
  }
</style>
