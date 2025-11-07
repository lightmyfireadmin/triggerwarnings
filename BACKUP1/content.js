// content.js v0.9.11 (Aggressive Fullscreen Button Reparenting)
console.log("Trigger Warnings: Content script loading (v0.9.11).");
console.log("Content Script: Top level execution started."); // For initial load check

// --- Constants ---
const BROWSER_API = typeof browser !== 'undefined' ? browser : chrome;
const BANNER_ID = 'tw-warning-banner';
const FLOATING_BUTTON_ID = 'tw-float-add-button';
const VIDEO_SELECTOR = 'video';
const CHECK_INTERVAL_MS = 250; // Check 4 times per second
const DEBOUNCE_DELAY_MS = 500;
const MAX_VIDEO_FIND_ATTEMPTS = 10;
const VIDEO_FIND_INTERVAL_MS = 750;
const SUPPORT_LINK = "https://www.buymeacoffee.com/MitchB";
const MUTE_VERIFY_DELAY_MS = 100;
const HIDE_VERIFY_DELAY_MS = 100;

// --- Global State ---
let state = {
    userPreferences: {}, generalSettings: {}, i18nMessages: {}, i18nReady: false,
    currentVideoElement: null, timeCheckIntervalId: null, pageObserver: null, observerDebounceTimer: null,
    currentVideoTriggers: [], lastFetchedVideoId: null, bannerElement: null, floatingButtonElement: null,
    extensionAppliedMute: false, extensionAppliedHide: false, ignoredTriggersThisTime: {}, ignoredTriggersForVideo: {},
    votedTriggers: {}, currentlyWarningCategories: new Set(), isBannerLogicallyVisible: false, warningAudio: null,
    iconUrl48: null, _internalIsVideoInFullscreen: false, documentFullscreenListenerAttached: false,
    videoFullscreenListenerAttached: false, pageChangeListenerAttached: false, messageListenerAttached: false,
    currentLanguage: 'auto', muteVerificationPending: false, hideVerificationPending: false
};

// --- Helper Functions ---
function getNetflixVideoId() {
    // Stricter match for /watch/ pages ONLY
    const match = window.location.pathname.match(/^\/watch\/(\d+)/);
    return match ? match[1] : null;
}

function getMessage(key, substitutions = null, fallback = null) {
    if (state.i18nReady && state.i18nMessages[key]?.message) {
        let message = state.i18nMessages[key].message;
        if (substitutions) {
            for (const subKey in substitutions) {
                message = message.replace(`$${subKey.toUpperCase()}$`, substitutions[subKey]);
            }
        }
        return message;
    }
    // Reduce console noise for missing keys unless explicitly debugging i18n
    // if (state.i18nReady) { console.warn(`[i18n] Key not found: "${key}". Using fallback: "${fallback !== null ? fallback : key}"`); }
    return fallback !== null ? fallback : key;
}


function getCategoryDisplayName(categoryKey) {
    const messageKey = `trigger${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1).replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`;
    const fallback = categoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return getMessage(messageKey, null, fallback);
}

async function loadI18nMessages() {
    state.i18nReady = false; state.i18nMessages = {}; let loadedLocale = 'en';
    try {
        const prefs = await BROWSER_API.storage.sync.get({ generalSettings: { language: 'auto' } });
        let targetLocale = prefs.generalSettings?.language;
        if (!targetLocale || targetLocale === 'auto') { targetLocale = BROWSER_API.i18n?.getUILanguage ? BROWSER_API.i18n.getUILanguage().split('-')[0] : 'en'; }
        let messagesData = null;
        if (targetLocale !== 'en') {
            try {
                const resp = await fetch(BROWSER_API.runtime.getURL(`_locales/${targetLocale}/messages.json`));
                if (resp.ok) { messagesData = await resp.json(); loadedLocale = targetLocale; }
                else { console.warn(`TW Content: Failed locale fetch '${targetLocale}'.`); }
            } catch (e) { console.warn(`TW Content: Error fetching locale '${targetLocale}'.`, e); }
        }
        if (!messagesData) {
            const resp = await fetch(BROWSER_API.runtime.getURL('_locales/en/messages.json'));
            if (!resp.ok) throw new Error(`Fallback fetch fail`); messagesData = await resp.json(); loadedLocale = 'en';
        }
        state.i18nMessages = messagesData; state.i18nReady = true;
        console.log(`TW Content: Translations ready (using '${loadedLocale}').`);
    } catch (e) { console.error("TW Content: CRITICAL - Failed to load any translations:", e); state.i18nMessages = {}; state.i18nReady = false; }
}

// --- Floating Button Management ---
function createFloatingButton(targetParent = document.body) {
    // Ensure it doesn't exist first
    let existingButton = document.getElementById(FLOATING_BUTTON_ID); // Use local var to avoid state race condition

    if (existingButton) {
        state.floatingButtonElement = existingButton; // Update state reference
        // console.log("[Button Create] Button already exists."); // Reduce noise
        // Ensure it's in the right parent
        if (existingButton.parentElement !== targetParent) {
            console.log(`[Button Create] Moving existing button from ${existingButton.parentElement?.tagName || 'detached'} to ${targetParent.tagName || 'body'}`);
            try {
                targetParent.appendChild(existingButton);
            } catch (e) {
                 console.error(`[Button Create] Error moving button to ${targetParent.tagName || 'body'}:`, e);
                 // Fallback if moving fails and target wasn't body
                 if (targetParent !== document.body) {
                     try { document.body.appendChild(existingButton); }
                     catch (e2) { console.error("[Button Create] Error moving button to body as fallback:", e2); }
                 }
            }
        }
        return; // Button exists (or was moved)
    }

    // Create new if it didn't exist
    // console.log(`[Button Create] Creating new button for ${targetParent.tagName || 'body'}`); // Reduce noise
    const newButton = document.createElement('button');
    newButton.id = FLOATING_BUTTON_ID;
    newButton.title = getMessage("floatingButtonTitle", null, "Add Trigger Warning");
    newButton.innerHTML = `<span class="tw-float-text">${getMessage("floatingButtonActiveText", null, "TW")}</span><span class="tw-float-icon">+</span>`;
    newButton.addEventListener('click', handleFloatingButtonClick);
    state.floatingButtonElement = newButton; // Update state reference

    try {
        targetParent.appendChild(newButton);
        // console.log(`[Button Create] Button appended to ${targetParent.tagName || 'body'}`); // Reduce noise
    } catch (e) {
         console.error(`[Button Create] Error appending button to ${targetParent.tagName || 'body'}, falling back:`, e);
         // Fallback to body if appending to target parent fails
         if (targetParent !== document.body) {
            try { document.body.appendChild(newButton); }
            catch (e2) { console.error("[Button Create] Error appending button to body as fallback:", e2); }
         }
    }
}

function updateFloatingButtonText() {
    if (!state.floatingButtonElement) return;
    const textSpan = state.floatingButtonElement.querySelector('.tw-float-text');
    if (textSpan) textSpan.textContent = getMessage("floatingButtonActiveText", null, "TW");
    state.floatingButtonElement.title = getMessage("floatingButtonTitle", null, "Add Trigger Warning");
}

function updateFloatingButtonVisibility() {
    // Check multiple fullscreen indicators FIRST
    const isDocFullscreen = !!document.fullscreenElement;
    const isWebkitFullscreen = state.currentVideoElement?.webkitDisplayingFullscreen;
    const isAnyFullscreen = isDocFullscreen || isWebkitFullscreen || state._internalIsVideoInFullscreen;

    // Determine the correct parent element
    const correctParent = isAnyFullscreen ? (document.fullscreenElement || document.body) : document.body;

    // Ensure button exists and is in the correct parent *before* checking visibility logic
    createFloatingButton(correctParent); // This now handles creation AND moving if parent is wrong

    // Check if the button actually exists *and is in the correct parent* after trying to create/move it
    if (!state.floatingButtonElement || !state.floatingButtonElement.isConnected || state.floatingButtonElement.parentElement !== correctParent) {
         console.warn(`[Button Visibility] Button check failed: Button is not connected or not in the correct parent (${correctParent.tagName || 'body'}) after create/move attempt.`);
          // Aggressively try to remove any old reference and recreate/append if possible
          if(state.floatingButtonElement?.isConnected) { // If it exists but is wrong parent
              try { state.floatingButtonElement.remove(); } catch(e){}
          }
          state.floatingButtonElement = null; // Nullify state ref
          createFloatingButton(correctParent); // Try one more time to create and append

          // Final check after re-attempt
          if (!state.floatingButtonElement || !state.floatingButtonElement.isConnected || state.floatingButtonElement.parentElement !== correctParent) {
              console.error("[Button Visibility] CRITICAL: Failed to ensure button existence in correct parent even after re-attempt. Button will be hidden.");
              // Force hide if we absolutely failed
              if (state.floatingButtonElement) { // Hide even if it's somewhere else
                    state.floatingButtonElement.classList.add('tw-float-hidden');
                    state.floatingButtonElement.classList.remove('tw-float-force-show');
                    state.floatingButtonElement.style.setProperty('display', 'none', 'important');
              }
              return; // Stop further processing
          } else {
              console.log("[Button Visibility] Button successfully recreated/re-parented after initial check failed.");
          }
    }


    // Now determine if it *should* be visible based on state
    const showSetting = state.generalSettings?.showFloatingButton ?? true;
    const isOnWatchPage = window.location.pathname.startsWith('/watch/');
    const hasVideoId = isOnWatchPage && !!state.lastFetchedVideoId;
    const shouldShow = showSetting && hasVideoId && !state.isBannerLogicallyVisible; // Only show if banner is hidden

    // Apply visibility styles
    if (shouldShow) {
        state.floatingButtonElement.classList.remove('tw-float-hidden');
        state.floatingButtonElement.style.removeProperty('display');
        state.floatingButtonElement.style.setProperty('display', 'flex', 'important');
        state.floatingButtonElement.style.setProperty('visibility', 'visible', 'important');
        state.floatingButtonElement.style.setProperty('opacity', '0.85', 'important');
        state.floatingButtonElement.style.setProperty('pointer-events', 'auto', 'important');
        state.floatingButtonElement.classList.add('tw-float-force-show');

        // Adjust position based on fullscreen
        if (isAnyFullscreen) {
            state.floatingButtonElement.style.setProperty('top', '50px', 'important');
            state.floatingButtonElement.style.setProperty('z-index', '9999999', 'important'); // Ensure high z-index
        } else {
            state.floatingButtonElement.style.setProperty('top', '15px', 'important');
        }
    } else {
        // Hide button
        state.floatingButtonElement.classList.add('tw-float-hidden');
        state.floatingButtonElement.classList.remove('tw-float-force-show');
        state.floatingButtonElement.style.setProperty('display', 'none', 'important');
        state.floatingButtonElement.style.setProperty('visibility', 'hidden', 'important');
        state.floatingButtonElement.style.setProperty('opacity', '0', 'important');
        state.floatingButtonElement.style.setProperty('pointer-events', 'none', 'important');
    }
}


function handleFloatingButtonClick() { BROWSER_API.runtime.sendMessage({ type: "OPEN_POPUP" }).catch(e => console.error("TW: Error sending OPEN_POPUP:", e)); }

// --- Banner Management ---
function ensureBannerExists() {
    const bannerId = BANNER_ID; let banner = state.bannerElement || document.getElementById(bannerId); const expectedParent = document.fullscreenElement || document.body;
    if (banner && banner.parentElement === expectedParent) { state.bannerElement = banner; return true; }
    if (banner && banner.parentElement !== expectedParent) {
        try { banner.parentElement?.removeChild(banner); expectedParent.appendChild(banner); if (banner.parentElement !== expectedParent) { console.error("[DEBUG] BANNER MOVE FAILED!"); return false; } state.bannerElement = banner; if (!banner.hasAttribute('data-listener-attached')) { banner.removeEventListener('click', handleBannerClick); banner.addEventListener('click', handleBannerClick); banner.setAttribute('data-listener-attached', 'true'); } return true; } catch (e) { console.error("[DEBUG] Error moving banner:", e); state.bannerElement = null; return false; }
    }
    if (!banner) {
        try { banner = document.createElement('div'); banner.id = bannerId; expectedParent.appendChild(banner); if (banner.parentElement !== expectedParent || !document.getElementById(bannerId)) { console.error("[DEBUG] BANNER CREATE/APPEND FAILED!"); state.bannerElement = null; return false; } banner.addEventListener('click', handleBannerClick); banner.setAttribute('data-listener-attached', 'true'); state.bannerElement = banner; return true; } catch (e) { console.error("[DEBUG] Error creating/appending banner:", e); state.bannerElement = null; return false; }
    } return false;
}
function updateAndShowBanner(warningDetails, activeDetails) {
    if (!ensureBannerExists()) { console.error("TW Content: Banner element missing. Aborting update."); return; }
    const hasWarnings = warningDetails.length > 0; const hasActives = activeDetails.length > 0; state.isBannerLogicallyVisible = hasWarnings || hasActives;
    updateFloatingButtonVisibility(); // Must be called *before* returning if banner shouldn't be visible
    if (!state.isBannerLogicallyVisible) { if (state.bannerElement.style.display !== 'none') { hideBanner(); } return; }
    let messagePartsHTML = ''; let isAnyTriggerActiveNonIgnored = false;
    warningDetails.sort((a, b) => a.secondsUntilStart - b.secondsUntilStart); activeDetails.sort((a, b) => a.secondsUntilEnd - b.secondsUntilEnd);
    const ignoredSuffix = ` ${getMessage("bannerIgnoredSuffix", null, "(Ignored)")}`;
    const createMessageSpan = (detail, type) => {
        const trigger = detail.trigger; if (!trigger?.categoryKey || !trigger.id || typeof trigger.startTime !== 'number') { return ''; }
        const categoryKey = trigger.categoryKey; const instanceId = `${categoryKey}_${trigger.startTime}`; const isIgnoredTime = state.ignoredTriggersThisTime[instanceId]; const isIgnoredVideo = state.ignoredTriggersForVideo[categoryKey];
        if (isIgnoredVideo) return ''; const displayName = getCategoryDisplayName(categoryKey); let messageText = ''; let secondsLeft = 0; let cssClass = `tw-message ${type}`;
        if (type === 'warning') { secondsLeft = Math.max(0, Math.ceil(detail.secondsUntilStart)); messageText = getMessage("bannerWarningFormat", { category: displayName, countdown: String(secondsLeft) }, `⚠️ ${displayName} in ${String(secondsLeft)}s`); }
        else { secondsLeft = Math.max(0, Math.ceil(detail.secondsUntilEnd)); messageText = getMessage("bannerActiveFormat", { category: displayName, countdown: String(secondsLeft) }, `Active: ${displayName} ending in ${String(secondsLeft)}s`); if (!isIgnoredTime) isAnyTriggerActiveNonIgnored = true; }
        if (isIgnoredTime) { cssClass += ' ignored'; messageText += ignoredSuffix; }
        let voteButtonsHTML = ''; if (type === 'active' && !isIgnoredTime) { const currentVote = state.votedTriggers[trigger.id]; const voteUpTooltip = getMessage("bannerVoteUpTooltip", null, "Accurate"); const voteDownTooltip = getMessage("bannerVoteDownTooltip", null, "Inaccurate"); const upDisabled = currentVote === 'up' ? 'disabled' : ''; const downDisabled = currentVote === 'down' ? 'disabled' : ''; voteButtonsHTML = ` <button type="button" class="tw-vote-btn tw-vote-up ${currentVote === 'up' ? 'voted-this' : ''}" data-action="up" data-trigger-id="${trigger.id}" title="${voteUpTooltip}" ${upDisabled}>👍</button> <button type="button" class="tw-vote-btn tw-vote-down ${currentVote === 'down' ? 'voted-this' : ''}" data-action="down" data-trigger-id="${trigger.id}" title="${voteDownTooltip}" ${downDisabled}>👎</button> `; }
        return `<span class="${cssClass}" data-trigger-id="${trigger.id}" data-instance-id="${instanceId}" data-category-key="${categoryKey}">${messageText}${voteButtonsHTML}</span>`;
    };
    const allMessageSpans = [...warningDetails.map(d => createMessageSpan(d, 'warning')), ...activeDetails.map(d => createMessageSpan(d, 'active'))].filter(span => span !== ''); messagePartsHTML = allMessageSpans.join('');
    const uniqueInstancesForButtons = {}; [...warningDetails, ...activeDetails].forEach(detail => { const t = detail.trigger; if (!t?.categoryKey || state.ignoredTriggersForVideo[t.categoryKey] || typeof t.startTime !== 'number') return; const iid = `${t.categoryKey}_${t.startTime}`; uniqueInstancesForButtons[iid] = { categoryKey: t.categoryKey, isIgnoredTime: !!state.ignoredTriggersThisTime[iid] }; });
    let ignoreButtonsHTML = ''; for (const instanceId in uniqueInstancesForButtons) { const { categoryKey, isIgnoredTime } = uniqueInstancesForButtons[instanceId]; const displayName = getCategoryDisplayName(categoryKey); const ignoreTimeText = getMessage("bannerIgnoreTimeButton", { category: displayName }, `Ignore ${displayName} This Time`); const ignoreVideoText = getMessage("bannerIgnoreVideoButton", { category: displayName }, `Ignore ${displayName} For Video`); if (!isIgnoredTime) ignoreButtonsHTML += `<button type="button" class="tw-ignore-btn" data-action="ignore-time" data-instance-id="${instanceId}" data-category-key="${categoryKey}">${ignoreTimeText}</button>`; ignoreButtonsHTML += `<button type="button" class="tw-ignore-btn" data-action="ignore-video" data-instance-id="${instanceId}" data-category-key="${categoryKey}">${ignoreVideoText}</button>`; }
    const addTriggerTooltip = getMessage("bannerAddTriggerTooltip", null, "Add Trigger Here"); const supportTooltip = getMessage("bannerSupportTooltip", null, "Support Developer"); const settingsTooltip = getMessage("bannerSettingsTooltip", null, "Open Settings"); const actionButtonsHTML = ` <button type="button" class="tw-icon-btn" data-action="add-trigger" title="${addTriggerTooltip}">+</button> <button type="button" class="tw-icon-btn" data-action="support-dev" title="${supportTooltip}">☕</button> <button type="button" class="tw-icon-btn" data-action="open-settings" title="${settingsTooltip}">⚙️</button> `;
    const buttonPartsHTML = `<span class="tw-buttons">${ignoreButtonsHTML}${actionButtonsHTML}</span>`; if (!state.iconUrl48) { try { state.iconUrl48 = BROWSER_API.runtime.getURL("images/icon48.png"); } catch(e) { state.iconUrl48 = ''; console.warn("TW: Failed icon URL"); } } const iconHTML = state.iconUrl48 ? `<img id="tw-banner-icon" src="${state.iconUrl48}" alt="TW Icon">` : ''; const finalHTML = `${iconHTML}<div class="tw-messages-container">${messagePartsHTML}</div>${buttonPartsHTML}`;
    state.bannerElement.innerHTML = finalHTML; state.bannerElement.style.backgroundColor = isAnyTriggerActiveNonIgnored ? (state.generalSettings.bannerColorActive || '#dc143c') : (state.generalSettings.bannerColorWarn || '#ffa500'); state.bannerElement.classList.toggle('active-trigger', isAnyTriggerActiveNonIgnored);
    if (state.bannerElement.style.display !== 'flex') { state.bannerElement.style.display = 'flex'; state.bannerElement.classList.add('visible'); }
}
function hideBanner() { if (!state.bannerElement || state.bannerElement.style.display === 'none') return; state.bannerElement.style.display = 'none'; state.bannerElement.classList.remove('visible'); state.isBannerLogicallyVisible = false; updateFloatingButtonVisibility(); }

// --- Fullscreen Handlers ---
function handleDocumentFullscreenChange() {
    const isDocFullscreen = !!document.fullscreenElement;
    // console.log(`[DEBUG] Document fullscreenchange triggered. New state: ${isDocFullscreen}`); // Reduce noise
    state._internalIsVideoInFullscreen = isDocFullscreen;

    requestAnimationFrame(() => {
        // Ensure banner exists AND is in the right parent *after* state change
        if (!ensureBannerExists()) { console.error("Banner ensure failed in Doc FS rAF."); }
        else if (state.bannerElement) { state.bannerElement.classList.toggle('fullscreen-mode', isDocFullscreen); }

        // Force button visibility/parent check AFTER fullscreen state change
        // console.log("[DEBUG] Calling updateFloatingButtonVisibility from Document fullscreen change rAF."); // Reduce noise
        updateFloatingButtonVisibility();

        // Re-check triggers if video is ready
        if (state.currentVideoElement && state.currentVideoElement.readyState >= 2) { checkForUpcomingTriggers(state.currentVideoElement.currentTime); }
    });
}
function handleVideoFullscreenChange(event) {
    const videoElement = event.target; let isDocFullscreen = !!document.fullscreenElement; let webkitState = typeof videoElement.webkitDisplayingFullscreen !== 'undefined' ? videoElement.webkitDisplayingFullscreen : false; if (!isDocFullscreen) isDocFullscreen = webkitState;
    // console.log(`[DEBUG] Video fullscreenchange event. Final determined state: ${isDocFullscreen}`); // Reduce noise
    state._internalIsVideoInFullscreen = isDocFullscreen;
    requestAnimationFrame(() => {
        // console.log("[DEBUG] Calling updateFloatingButtonVisibility from Video fullscreen change rAF."); // Reduce noise
        updateFloatingButtonVisibility(); // Check button state
        handleDocumentFullscreenChange(); // Also run document handler to ensure banner state/parent is correct
    });
}

// --- Core Logic ---
function checkForUpcomingTriggers(currentTime) {
    if (!Array.isArray(state.currentVideoTriggers)) { return; } // Waiting for data
    if (state.currentVideoTriggers.length === 0) { if (state.isBannerLogicallyVisible) { hideBanner(); revertPlayerActions(); state.isBannerLogicallyVisible = false; } updateFloatingButtonVisibility(); return; }

    const leadTime = state.generalSettings?.leadTime ?? 10;
    const upcomingWarnings = []; const activeTriggers = []; const nowWarningCategories = new Set();
    let needsActionMute = false; let needsActionHide = false;

    for (const trigger of state.currentVideoTriggers) {
        const startTime = Number(trigger.start_time); const endTime = Number(trigger.end_time);
        const categoryKey = trigger.category_key; const id = trigger.id;
        if (!categoryKey || typeof startTime !== 'number' || isNaN(startTime) || typeof endTime !== 'number' || isNaN(endTime)) continue;
        const instanceId = `${categoryKey}_${startTime}`; if (state.ignoredTriggersForVideo[categoryKey]) continue;
        const secondsUntilStart = startTime - currentTime; const secondsUntilEnd = endTime - currentTime; const isIgnoredThisTime = state.ignoredTriggersThisTime[instanceId];

        // Active condition (Must end strictly AFTER current time)
        if (secondsUntilStart <= 0.05 && secondsUntilEnd > 0.05) { // Use small tolerance
            activeTriggers.push({ trigger: { ...trigger, startTime, endTime, categoryKey, id }, secondsUntilEnd });
            if (!isIgnoredThisTime) {
                nowWarningCategories.add(categoryKey); const action = state.userPreferences[categoryKey]?.action || 'warn';
                if (action === 'mute' || action === 'mute_hide') needsActionMute = true; if (action === 'hide' || action === 'mute_hide') needsActionHide = true;
            }
        } else if (secondsUntilStart > 0.05 && secondsUntilStart <= leadTime) { // Upcoming
            upcomingWarnings.push({ trigger: { ...trigger, startTime, endTime, categoryKey, id }, secondsUntilStart });
        }
    }

    const wasWarning = state.currentlyWarningCategories.size > 0; const isWarning = nowWarningCategories.size > 0;
    if (isWarning && !wasWarning && (state.generalSettings?.playSound ?? false)) { playSound(); }
    state.currentlyWarningCategories = nowWarningCategories;
    applyPlayerActions(needsActionMute, needsActionHide);
    updateAndShowBanner(upcomingWarnings, activeTriggers); // Redraws based ONLY on current active/upcoming
}

function playSound() {
    if (!state.warningAudio) {
        try { const audioPath = getMessage("audioWarningSound", null, "audio/warning.mp3"); if (!audioPath) throw new Error("Invalid path"); const audioUrl = BROWSER_API.runtime.getURL(audioPath); state.warningAudio = new Audio(audioUrl); }
        catch(e) { console.error("Error loading warning sound:", e); state.warningAudio = null; return; }
    }
    if (state.warningAudio) { state.warningAudio.play().catch(e => console.error("Error playing sound:", e)); }
}
function applyPlayerActions(shouldMute, shouldHide) {
    if (!state.currentVideoElement?.isConnected) { if (state.extensionAppliedMute || state.extensionAppliedHide) { revertPlayerActions(); } return; }
    const video = state.currentVideoElement; const hideClass = 'tw-video-hidden';
    try { // Mute Logic
        const currentlyMuted = video.muted; if (shouldMute && !currentlyMuted && !state.extensionAppliedMute) { state.extensionAppliedMute = true; video.muted = true; if (!state.muteVerificationPending) { state.muteVerificationPending = true; setTimeout(() => { if (state.extensionAppliedMute && video.isConnected && !video.muted) console.warn(`[VERIFY] MUTE FAILED!`); state.muteVerificationPending = false; }, MUTE_VERIFY_DELAY_MS); } } else if (!shouldMute && state.extensionAppliedMute) { video.muted = false; state.extensionAppliedMute = false; if (!state.muteVerificationPending) { state.muteVerificationPending = true; setTimeout(() => { if (!state.extensionAppliedMute && video.isConnected && video.muted) console.warn(`[VERIFY] UNMUTE FAILED!`); state.muteVerificationPending = false; }, MUTE_VERIFY_DELAY_MS); } }
    } catch (e) { console.error("Error applying mute:", e); state.extensionAppliedMute = false; }
    try { // Hide Logic
        const hasHideClass = video.classList.contains(hideClass); if (shouldHide && !hasHideClass) { state.extensionAppliedHide = true; video.classList.add(hideClass); if (!state.hideVerificationPending) { state.hideVerificationPending = true; setTimeout(() => { if (state.extensionAppliedHide && video.isConnected && !video.classList.contains(hideClass)) console.warn(`[VERIFY] HIDE FAILED!`); state.hideVerificationPending = false; }, HIDE_VERIFY_DELAY_MS); } } else if (!shouldHide && state.extensionAppliedHide) { video.classList.remove(hideClass); state.extensionAppliedHide = false; if (!state.hideVerificationPending) { state.hideVerificationPending = true; setTimeout(() => { if (!state.extensionAppliedHide && video.isConnected && video.classList.contains(hideClass)) console.warn(`[VERIFY] UNHIDE FAILED!`); state.hideVerificationPending = false; }, HIDE_VERIFY_DELAY_MS); } }
    } catch (e) { console.error("Error applying hide:", e); state.extensionAppliedHide = false; }
}
function revertPlayerActions() {
    if (state.currentVideoElement?.isConnected) {
        try { if (state.extensionAppliedMute) { state.currentVideoElement.muted = false; } if (state.extensionAppliedHide) { state.currentVideoElement.classList.remove('tw-video-hidden'); } } catch (e) { console.error("Error reverting actions:", e); }
    } state.extensionAppliedMute = false; state.extensionAppliedHide = false; state.currentlyWarningCategories.clear();
}

// --- Event Handling ---
function handleBannerClick(event) {
    const target = event.target; const actionButton = target.closest('button[data-action]'); if (!actionButton) return; event.preventDefault(); event.stopPropagation();
    const action = actionButton.dataset.action; const instanceId = actionButton.dataset.instanceId; const categoryKey = actionButton.dataset.categoryKey; const triggerId = actionButton.dataset.triggerId || target.closest('.tw-message')?.dataset.triggerId;
    switch (action) {
        case 'ignore-time': if (instanceId && categoryKey) { state.ignoredTriggersThisTime[instanceId] = true; if (state.currentVideoElement && state.currentVideoElement.readyState >= 2) checkForUpcomingTriggers(state.currentVideoElement.currentTime); else { hideBanner(); updateFloatingButtonVisibility(); } } break;
        case 'ignore-video': if (categoryKey) { state.ignoredTriggersForVideo[categoryKey] = true; Object.keys(state.ignoredTriggersThisTime).forEach(iId => { if (iId.startsWith(categoryKey + '_')) delete state.ignoredTriggersThisTime[iId]; }); Object.keys(state.votedTriggers).forEach(tId => { const trigger = state.currentVideoTriggers.find(t => t.id === tId); if (trigger?.category_key === categoryKey) delete state.votedTriggers[tId]; }); if (state.currentVideoElement && state.currentVideoElement.readyState >= 2) checkForUpcomingTriggers(state.currentVideoElement.currentTime); else { hideBanner(); updateFloatingButtonVisibility(); } } break; // Updated categoryKey access
        case 'add-trigger': BROWSER_API.runtime.sendMessage({ type: "OPEN_POPUP" }).catch(e => console.error("Error sending OPEN_POPUP:", e)); break;
        case 'support-dev': if (!SUPPORT_LINK || SUPPORT_LINK.includes("YOUR")) { alert("Support link not configured."); return; } BROWSER_API.runtime.sendMessage({ type: "OPEN_TAB", url: SUPPORT_LINK }).catch(e => console.error("Error sending OPEN_TAB:", e)); break;
        case 'open-settings': BROWSER_API.runtime.sendMessage({ type: "OPEN_OPTIONS" }).catch(e => console.error("Error sending OPEN_OPTIONS:", e)); break;
        case 'up': case 'down': if (triggerId) { handleVote(triggerId, action, actionButton); } break;
        default: console.warn("Unhandled banner action:", action);
    }
}
function handleVote(triggerId, voteType, buttonElement) {
    if (!buttonElement || buttonElement.disabled) return; console.log(`Voting ${voteType} for ${triggerId}`); state.votedTriggers[triggerId] = voteType;
    const messageSpan = buttonElement.closest('.tw-message[data-trigger-id="' + triggerId + '"]');
    if (messageSpan) { messageSpan.querySelectorAll(`.tw-vote-btn[data-trigger-id="${triggerId}"]`).forEach(btn => { const isThis = btn.dataset.action === voteType; btn.disabled = isThis; btn.classList.toggle('voted-this', isThis); }); }
    else { console.warn("No msg span for vote UI:", triggerId); buttonElement.disabled = true; buttonElement.classList.add('voted-this'); const otherType = voteType === 'up' ? 'down' : 'up'; const otherBtn = buttonElement.parentElement?.querySelector(`.tw-vote-btn[data-action="${otherType}"]`); if (otherBtn) { otherBtn.disabled = false; otherBtn.classList.remove('voted-this'); } }
    BROWSER_API.runtime.sendMessage({ type: "FIRESTORE_VOTE", data: { triggerId, voteType, videoId: state.lastFetchedVideoId } })
    .then(response => { if (BROWSER_API.runtime.lastError || response?.status !== "success") throw new Error(response?.message || BROWSER_API.runtime.lastError?.message || 'Vote failed'); console.log(`Vote ${voteType} for ${triggerId} confirmed.`); })
    .catch(error => { console.error("Error voting:", error); delete state.votedTriggers[triggerId]; if (messageSpan) { messageSpan.querySelectorAll(`.tw-vote-btn[data-trigger-id="${triggerId}"]`).forEach(btn => { btn.disabled = false; btn.classList.remove('voted-this'); }); } else { buttonElement.disabled = false; buttonElement.classList.remove('voted-this'); const otherType = voteType === 'up' ? 'down' : 'up'; const otherBtn = buttonElement.parentElement?.querySelector(`.tw-vote-btn[data-action="${otherType}"]`); if (otherBtn) { otherBtn.disabled = false; otherBtn.classList.remove('voted-this'); } } });
}

// --- Event Listeners for Video Playback ---
function addSeekListener() {
    if (!state.currentVideoElement?.isConnected) return;
    state.currentVideoElement.removeEventListener('seeking', handleVideoSeeking); state.currentVideoElement.removeEventListener('seeked', handleVideoSeeked); state.currentVideoElement.removeEventListener('play', handleVideoPlay); state.currentVideoElement.removeEventListener('pause', handleVideoPause);
    state.currentVideoElement.addEventListener('seeking', handleVideoSeeking); state.currentVideoElement.addEventListener('seeked', handleVideoSeeked); state.currentVideoElement.addEventListener('play', handleVideoPlay); state.currentVideoElement.addEventListener('pause', handleVideoPause);
}
function handleVideoSeeking(event) { /* No action needed */ }
function handleVideoPause(event) { /* No action needed */ }
function handleVideoSeeked(event) { if (state.currentVideoElement && state.lastFetchedVideoId && Array.isArray(state.currentVideoTriggers) && state.currentVideoElement.readyState >= 2) { checkForUpcomingTriggers(state.currentVideoElement.currentTime); } }
function handleVideoPlay(event) { if (state.currentVideoElement && state.lastFetchedVideoId && Array.isArray(state.currentVideoTriggers) && state.currentVideoElement.readyState >= 2) { checkForUpcomingTriggers(state.currentVideoElement.currentTime); } }

// --- Initialization and Monitoring ---
async function loadUserPreferences() {
     try { const data = await BROWSER_API.storage.sync.get({ triggerPreferences: {}, generalSettings: {} }); state.userPreferences = data.triggerPreferences || {}; state.generalSettings = { showFloatingButton: true, leadTime: 10, bannerColorWarn: '#ffa500', bannerColorActive: '#dc143c', playSound: false, language: 'auto', ...(data.generalSettings || {}) }; const newLang = state.generalSettings.language || 'auto'; if (newLang !== state.currentLanguage || !state.i18nReady) { await loadI18nMessages(); state.currentLanguage = newLang; updateFloatingButtonText(); if (state.isBannerLogicallyVisible && state.currentVideoElement && state.currentVideoElement.readyState >= 2) { checkForUpcomingTriggers(state.currentVideoElement.currentTime); } } }
     catch (e) { console.error("Error loading prefs:", e); state.userPreferences = {}; state.generalSettings = { showFloatingButton: true, leadTime: 10, bannerColorWarn: '#ffa500', bannerColorActive: '#dc143c', playSound: false, language: 'auto' }; }
}
function findAndMonitorVideo() {
    if (!window.location.pathname.startsWith('/watch/')) { if (state.currentVideoElement || state.timeCheckIntervalId) { stopMonitoringTime(); } return; }
    const videoElements = document.querySelectorAll(VIDEO_SELECTOR); let mainVideoElement = null; let largestArea = 0; videoElements.forEach(vid => { if (vid.offsetParent !== null) { const rect = vid.getBoundingClientRect(); const area = rect.width * rect.height; if (area > largestArea) { largestArea = area; mainVideoElement = vid; } } }); if (!mainVideoElement && videoElements.length > 0) mainVideoElement = videoElements[0];
    if (mainVideoElement && mainVideoElement !== state.currentVideoElement) { console.log("Found new video element."); stopMonitoringTime(); state.currentVideoElement = mainVideoElement; if (!state.videoFullscreenListenerAttached) { const fsEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']; fsEvents.forEach(ev => { state.currentVideoElement.addEventListener(ev, handleVideoFullscreenChange); }); state.videoFullscreenListenerAttached = true; handleVideoFullscreenChange({ target: state.currentVideoElement }); } startMonitoringTime(); }
    else if (!mainVideoElement && state.currentVideoElement) { console.log("Video element lost."); stopMonitoringTime(); }
    else if (mainVideoElement && mainVideoElement === state.currentVideoElement && state.timeCheckIntervalId === null) { console.log("Monitoring stopped, restarting."); startMonitoringTime(); }
    else if (!mainVideoElement && !state.currentVideoElement && state.lastFetchedVideoId) { state.lastFetchedVideoId = null; updateFloatingButtonVisibility(); }
}
function stopMonitoringTime() {
    if (state.timeCheckIntervalId !== null) { clearInterval(state.timeCheckIntervalId); state.timeCheckIntervalId = null; }
    if (state.currentVideoElement) { if (state.videoFullscreenListenerAttached) { const fsEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']; fsEvents.forEach(ev => state.currentVideoElement.removeEventListener(ev, handleVideoFullscreenChange)); state.videoFullscreenListenerAttached = false; } state.currentVideoElement.removeEventListener('seeking', handleVideoSeeking); state.currentVideoElement.removeEventListener('seeked', handleVideoSeeked); state.currentVideoElement.removeEventListener('play', handleVideoPlay); state.currentVideoElement.removeEventListener('pause', handleVideoPause); }
    revertPlayerActions(); hideBanner();
    state.currentVideoElement = null; state._internalIsVideoInFullscreen = false;
    state.lastFetchedVideoId = null; state.currentVideoTriggers = []; // Clear ID and triggers
    updateFloatingButtonVisibility();
}
function startMonitoringTime() {
    if (state.timeCheckIntervalId !== null || !state.currentVideoElement) return;
    addSeekListener(); monitorTimeTick(); state.timeCheckIntervalId = setInterval(monitorTimeTick, CHECK_INTERVAL_MS); updateFloatingButtonVisibility();
}
function monitorTimeTick() {
    try {
        if (!window.location.pathname.startsWith('/watch/')) { if (state.timeCheckIntervalId) { stopMonitoringTime(); } return; }
        const isVideoConnected = state.currentVideoElement?.isConnected ?? false; const isVideoInCorrectContext = document.body.contains(state.currentVideoElement) || (document.fullscreenElement?.contains(state.currentVideoElement) ?? false); if (!state.currentVideoElement || !isVideoConnected || !isVideoInCorrectContext) { stopMonitoringTime(); return; }
        const currentPageVideoId = getNetflixVideoId(); if (!currentPageVideoId) { if (state.lastFetchedVideoId) { stopMonitoringTime(); } return; }

        if (currentPageVideoId !== state.lastFetchedVideoId) {
            console.log(`TW Content: Video ID changed to ${currentPageVideoId}. Resetting & fetching triggers.`);
            state.currentVideoTriggers = []; state.ignoredTriggersThisTime = {}; state.ignoredTriggersForVideo = {}; state.votedTriggers = {}; state.currentlyWarningCategories.clear(); revertPlayerActions(); hideBanner();
            state.lastFetchedVideoId = currentPageVideoId; updateFloatingButtonVisibility();
            console.log(`>>> CONTENT SCRIPT: Sending FIRESTORE_GET_TRIGGERS message NOW for video ID: ${state.lastFetchedVideoId}`);
            BROWSER_API.runtime.sendMessage({ type: "FIRESTORE_GET_TRIGGERS", videoId: state.lastFetchedVideoId })
                .then(response => {
                    console.log(`>>> CONTENT SCRIPT: Successfully received DIRECT RESPONSE for FIRESTORE_GET_TRIGGERS.`);
                    if (BROWSER_API.runtime.lastError) throw new Error(BROWSER_API.runtime.lastError.message);
                    if (response?.videoId === state.lastFetchedVideoId && response?.status === "success") { const rT = response.triggers || []; console.log(`Content: Rcvd ${rT.length} triggers for ${state.lastFetchedVideoId}.`); state.currentVideoTriggers = rT; if (state.currentVideoElement && state.currentVideoElement.readyState >= 2) checkForUpcomingTriggers(state.currentVideoElement.currentTime); }
                    else if (response?.videoId !== state.lastFetchedVideoId) { console.warn(`Content: Rcvd trigger data for wrong video ${response?.videoId}.`); }
                    else { console.error(`Content: Error in trigger response: ${response?.message}`); state.currentVideoTriggers = []; hideBanner(); revertPlayerActions(); }
                    updateFloatingButtonVisibility();
                }).catch(e => { console.error(`>>> CONTENT SCRIPT: Error in sendMessage promise for FIRESTORE_GET_TRIGGERS:`, e); state.currentVideoTriggers = []; hideBanner(); revertPlayerActions(); updateFloatingButtonVisibility(); });
            return; // Exit after starting fetch
        }

        const time = state.currentVideoElement.currentTime; const readyState = state.currentVideoElement.readyState;
        if (typeof time === 'number' && !isNaN(time) && time >= 0 && readyState >= 2) { if (Array.isArray(state.currentVideoTriggers)) { checkForUpcomingTriggers(time); } }
        updateFloatingButtonVisibility();
    } catch(e) { console.error("TW: CRITICAL Error in monitoring interval:", e); stopMonitoringTime(); }
}

function startPageObserver() {
    if (state.pageObserver) return;
    const observerCallback = (mutationsList, observer) => { if (state.observerDebounceTimer) clearTimeout(state.observerDebounceTimer); state.observerDebounceTimer = setTimeout(() => { findAndMonitorVideo(); state.observerDebounceTimer = null; }, DEBOUNCE_DELAY_MS); };
    state.pageObserver = new MutationObserver(observerCallback); state.pageObserver.observe(document.body, { childList: true, subtree: true, attributes: false }); console.log("TW Content: Page MutationObserver started.");
}
function handleRuntimeMessages(message, sender, sendResponse) {
    const messageType = message?.type || 'UNKNOWN';
    switch (message.type) {
        case "GET_VIDEO_STATE": const currentVideoId = getNetflixVideoId(); let response = { isPlaying: false, currentTime: null, videoId: currentVideoId }; if (state.currentVideoElement?.isConnected && state.currentVideoElement.readyState >= 2) { try { response.currentTime = state.currentVideoElement.currentTime; response.isPlaying = !state.currentVideoElement.paused && !state.currentVideoElement.ended; } catch (e) { console.error("TW: Error getting video state:", e); } } Promise.resolve(response).then(sendResponse); return true; // Async response
        case "PLAY_VIDEO": if (state.currentVideoElement?.isConnected) state.currentVideoElement.play().catch(e => console.error("TW: Play error:", e)); break;
        case "PAUSE_VIDEO": if (state.currentVideoElement?.isConnected) state.currentVideoElement.pause(); break;
        case "PREFERENCES_UPDATED": loadUserPreferences().then(() => { if (state.currentVideoElement?.isConnected && state.lastFetchedVideoId && state.currentVideoElement.readyState >= 2) { checkForUpcomingTriggers(state.currentVideoElement.currentTime); } updateFloatingButtonVisibility(); }); break;
        case "TRIGGER_ADDED_SUCCESS": state.currentVideoTriggers = []; state.lastFetchedVideoId = null; if (state.currentVideoElement?.isConnected) monitorTimeTick(); break;
        default: break;
    } return message.type === "GET_VIDEO_STATE";
}

// --- Initialization Sequence ---
async function initialize() {
    console.log("TW Content: initialize() function ENTERED.");
    console.log("TW Content: Initializing script...");
    await Promise.all([ loadI18nMessages(), loadUserPreferences() ]);
    console.log("TW Content: Translations and preferences loaded.");
    state.currentLanguage = state.generalSettings.language || 'auto';
    ensureBannerExists(); createFloatingButton(); startPageObserver(); findAndMonitorVideo();

    let attempts = 0; const fallbackIntervalId = setInterval(() => { if (state.currentVideoElement || attempts >= MAX_VIDEO_FIND_ATTEMPTS) { clearInterval(fallbackIntervalId); return; } attempts++; findAndMonitorVideo(); }, VIDEO_FIND_INTERVAL_MS);
    if (!state.documentFullscreenListenerAttached) { document.addEventListener('fullscreenchange', handleDocumentFullscreenChange); state.documentFullscreenListenerAttached = true; state._internalIsVideoInFullscreen = !!document.fullscreenElement; updateFloatingButtonVisibility(); }
    if (!state.pageChangeListenerAttached) { window.addEventListener('popstate', () => setTimeout(findAndMonitorVideo, 200)); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(findAndMonitorVideo, 100); }); state.pageChangeListenerAttached = true; }
    if (!state.messageListenerAttached) { BROWSER_API.runtime.onMessage.addListener(handleRuntimeMessages); state.messageListenerAttached = true; }
    console.log("TW Content: Initialization sequence complete.");
}

// --- Start Initialization ---
if (document.readyState === 'loading') {
    console.log("Content Script: DOM not ready, adding DOMContentLoaded listener.");
    document.addEventListener('DOMContentLoaded', () => {
        console.log("Content Script: DOMContentLoaded fired, scheduling initialize.");
        setTimeout(initialize, 100);
    });
} else {
    console.log("Content Script: DOM ready, scheduling initialize immediately.");
    setTimeout(initialize, 100);
}
console.log("Content Script: Script execution finished.");