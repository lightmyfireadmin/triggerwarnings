// background.js (Service Worker - v0.9.2 - Refined Error Handling & Logging)
console.log("Background Service Worker Starting (v0.9.2 - Offscreen Architecture)");

const BROWSER_API = typeof browser !== 'undefined' ? browser : chrome;
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

let creatingOffscreenPromise = null;
let offscreenDocumentReady = false;
let offscreenReadyResolver = null;
let offscreenCloseHandler = null;

// --- Offscreen Document Management ---

async function hasOffscreenDocument() {
    // Check if the document is already open.
    if (BROWSER_API.runtime.getContexts) {
        const contexts = await BROWSER_API.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [BROWSER_API.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
        });
        return !!contexts?.length;
    } else {
        console.warn("Browser API chrome.runtime.getContexts not available for precise offscreen check.");
        return offscreenDocumentReady;
    }
}


async function setupOffscreenDocument() {
    console.log("BG: Checking for existing offscreen document...");
    if (await hasOffscreenDocument()) {
        console.log("BG: Offscreen document potentially exists.");
        if (offscreenDocumentReady) {
            console.log("BG: Offscreen document is marked as ready.");
            return true;
        } else {
            console.log("BG: Document exists but not ready, waiting for ready signal (or timeout)...");
            if (creatingOffscreenPromise) return creatingOffscreenPromise;
            return new Promise((resolve) => {
                offscreenReadyResolver = resolve;
            });
        }
    }

    if (creatingOffscreenPromise) {
        console.log("BG: Offscreen document creation already in progress. Waiting...");
        return creatingOffscreenPromise;
    }

    console.log("BG: Creating offscreen document...");
    creatingOffscreenPromise = new Promise(async (resolve, reject) => {
        let creationTimeoutId = null;
        const cleanup = () => {
            if (creationTimeoutId) clearTimeout(creationTimeoutId);
            if (offscreenReadyResolver === resolve) offscreenReadyResolver = null;
             // Set creatingOffscreenPromise to null AFTER the promise settles
            // creatingOffscreenPromise = null; // Moved below
        };

        offscreenReadyResolver = (success) => { // Accept success/failure boolean
            console.log(`BG: offscreenReadyResolver called with success=${success}.`);
            if (creationTimeoutId) clearTimeout(creationTimeoutId); // Clear timeout immediately
            if (success) {
                console.log("BG: Received OFFSCREEN_READY, resolving creation promise.");
                offscreenDocumentReady = true;
                 creatingOffscreenPromise = null; // Clear promise on success
                 offscreenReadyResolver = null; // Clear resolver
                 resolve(true);
            } else {
                console.error("BG: Offscreen reported failure or resolver called with false.");
                offscreenDocumentReady = false;
                 creatingOffscreenPromise = null; // Clear promise on failure
                 offscreenReadyResolver = null; // Clear resolver
                 reject(new Error("Offscreen document failed to become ready."));
                 // closeOffscreenDocument(); // Don't auto-close here, let timeout handle it if needed
            }
        };

        creationTimeoutId = setTimeout(() => {
            if (creatingOffscreenPromise) {
                 console.error("BG: Timeout waiting for OFFSCREEN_READY message during creation.");
                 const error = new Error("Timeout waiting for offscreen document to become ready.");
                 creatingOffscreenPromise = null; // Clear promise on timeout
                 offscreenReadyResolver = null; // Clear resolver
                 reject(error);
                 closeOffscreenDocument(); // Attempt cleanup
            }
        }, 15000);

        try {
            await BROWSER_API.offscreen.createDocument({
                url: OFFSCREEN_DOCUMENT_PATH,
                reasons: [BROWSER_API.offscreen.Reason.WEB_RTC],
                justification: 'Handles Supabase connection and operations.',
            });
            console.log("BG: Offscreen document created via API call. Waiting for OFFSCREEN_READY signal...");

            if (BROWSER_API.offscreen.onDocumentClosed && !offscreenCloseHandler) {
                 offscreenCloseHandler = () => {
                      console.warn("BG: Offscreen document closed unexpectedly (onDocumentClosed event).");
                      offscreenDocumentReady = false;
                      creatingOffscreenPromise = null;
                      if (offscreenReadyResolver) {
                         // If we were waiting for ready, treat this as a failure
                         offscreenReadyResolver(false);
                      }
                      offscreenReadyResolver = null;
                      if (creationTimeoutId) clearTimeout(creationTimeoutId);
                      offscreenCloseHandler = null; // Remove self after firing once
                 };
                 BROWSER_API.offscreen.onDocumentClosed.addListener(offscreenCloseHandler);
            }

        } catch (error) {
            console.error("BG: Error creating offscreen document:", error);
            cleanup(); // Clear timeout/resolver
            creatingOffscreenPromise = null; // Explicitly clear promise here too
            reject(error);
        }
    });

    return creatingOffscreenPromise;
}


async function closeOffscreenDocument() {
    if (!(await hasOffscreenDocument())) {
        console.log("BG: No offscreen document to close.");
        offscreenDocumentReady = false;
        return;
    }
    console.log("BG: Closing offscreen document.");
    try {
         if (BROWSER_API.offscreen.onDocumentClosed && offscreenCloseHandler) {
             BROWSER_API.offscreen.onDocumentClosed.removeListener(offscreenCloseHandler);
             offscreenCloseHandler = null;
         }
        await BROWSER_API.offscreen.closeDocument();
        offscreenDocumentReady = false;
        console.log("BG: Offscreen document closed.");
    } catch (error) {
        console.error("BG: Error closing offscreen document:", error);
        offscreenDocumentReady = false;
    }
}

const pendingRequests = new Map();

function generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

async function sendMessageToOffscreen(message) {
    if (!message.requestId) {
        message.requestId = generateRequestId();
        console.warn(`BG: Message type ${message.type} sent to offscreen without requestId. Generated: ${message.requestId}`);
    }
    const currentRequestId = message.requestId; // Store locally for error handling

    try {
        await setupOffscreenDocument();
        console.log(`BG: Sending message to offscreen (ReqID: ${currentRequestId}):`, message);
        BROWSER_API.runtime.sendMessage(message).catch(err => {
            // Check if the error is the specific channel closed error
            if (err.message?.includes("Message channel closed") || err.message?.includes("disconnected port")) {
                console.warn(`BG: Channel closed error sending message type ${message.type} (ReqID: ${currentRequestId}). This might be okay if response was already processed. Error: ${err.message}`);
                // Don't necessarily close offscreen here, it might have just finished processing.
                // Check if the request is still pending - if so, it failed.
                 if (pendingRequests.has(currentRequestId)) {
                     console.error(`BG: Channel closed AND request ${currentRequestId} still pending. Removing and invoking error callback.`);
                     const callback = pendingRequests.get(currentRequestId);
                     if (callback) {
                          try {
                              callback({ status: 'error', message: `Message channel closed before response for ${currentRequestId}` });
                          } catch (e) { console.error(`BG: Error invoking error callback for ReqID ${currentRequestId}:`, e); }
                     }
                     pendingRequests.delete(currentRequestId);
                      // Consider closing offscreen if send consistently fails
                      // closeOffscreenDocument();
                 }
            } else {
                 // Handle other sending errors
                 console.error(`BG: Unexpected error sending message type ${message.type} (ReqID: ${currentRequestId}) to offscreen: ${err.message}. Removing pending request.`);
                 if (pendingRequests.has(currentRequestId)) {
                      const callback = pendingRequests.get(currentRequestId);
                     if (callback) {
                         try {
                             callback({ status: 'error', message: `Failed to send message to offscreen: ${err.message}` });
                         } catch (e) { console.error(`BG: Error invoking error callback for ReqID ${currentRequestId}:`, e); }
                     }
                     pendingRequests.delete(currentRequestId);
                      closeOffscreenDocument(); // Close on unexpected send error
                 }
            }
        });
        return currentRequestId;
    } catch (error) {
        console.error(`BG: Failed to setup offscreen before sending message type ${message.type} (ReqID: ${currentRequestId}):`, error);
        if (pendingRequests.has(currentRequestId)) {
            const callback = pendingRequests.get(currentRequestId);
            if (callback) {
                 try {
                    callback({ status: 'error', message: `Failed to setup offscreen: ${error.message}` });
                 } catch (e) { console.error(`BG: Error invoking error callback for ReqID ${currentRequestId}:`, e); }
            }
            pendingRequests.delete(currentRequestId);
        }
        throw error;
    }
}

// --- Message Handling ---

BROWSER_API.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const messageType = message?.type || 'UNKNOWN';
    const requestId = message.requestId; // Get requestId if sender included one
    const isFromOffscreen = sender.url?.includes(OFFSCREEN_DOCUMENT_PATH);
    const isFromContent = sender.tab;
    const isFromPopup = !sender.tab && sender.url?.includes('popup.html');
    const isFromOptions = !sender.tab && sender.url?.includes('options.html');
    const senderOrigin = isFromOffscreen ? 'Offscreen' : isFromContent ? `Content(Tab ${sender.tab.id})` : isFromPopup ? 'Popup' : isFromOptions ? 'Options' : 'Unknown';

    console.log(`BG: Received message: Type=${messageType}, From=${senderOrigin}, ReqID=${requestId || 'N/A'}`);

    // --- Messages FROM Offscreen Document ---
    if (isFromOffscreen) {
        switch (messageType) {
            case 'OFFSCREEN_READY':
                console.log("BG: Offscreen document signaled READY via message.");
                if (offscreenReadyResolver) {
                    offscreenReadyResolver(true);
                } else {
                    offscreenDocumentReady = true;
                }
                return false;

            case 'INIT_ERROR':
                console.error("BG: Received initialization error from offscreen:", message.error);
                offscreenDocumentReady = false;
                 if (offscreenReadyResolver) {
                     offscreenReadyResolver(false); // Indicate failure
                 }
                 creatingOffscreenPromise = null;
                 offscreenReadyResolver = null;
                 closeOffscreenDocument();
                return false;

            case 'OPERATION_RESULT':
                // Ensure requestId exists on the incoming message from offscreen
                if (!requestId) {
                    console.error(`BG: Received OPERATION_RESULT from Offscreen WITHOUT ReqID! OriginalType: ${message.originalType}`, message.result);
                    return false; // Cannot process without ID
                }
                console.log(`BG: Received OPERATION_RESULT for ReqID ${requestId} (Original: ${message.originalType})`);
                const callback = pendingRequests.get(requestId);
                if (callback) {
                    console.log(`BG: Found callback for ReqID ${requestId}. Invoking.`);
                    try { callback(message.result); } catch (e) { console.error(`BG: Error invoking sendResponse callback for ReqID ${requestId}:`, e); }
                    pendingRequests.delete(requestId);
                } else {
                    console.warn(`BG: No callback found for completed operation ReqID ${requestId} (Original: ${message.originalType}). Result:`, message.result);
                }
                return false;

            case 'AUTH_STATE_CHANGED':
                 console.log(`BG: Auth state changed in offscreen: User=${message.userId ? message.userId.substring(0,8)+'...' : 'null'}, Status=${message.status}`);
                 return false;

             case 'OFFSCREEN_PING':
                 console.log("BG: Received PING from Offscreen (unexpected). Responding ack.");
                 sendResponse({ status: "ack", message: "pong (from background)" });
                 return false;

            default:
                console.warn(`BG: Unhandled message type from Offscreen: ${messageType}`);
                return false;
        }
    }
    // --- Messages TO Offscreen Document (from Content/Popup/Options) ---
    else {
        switch (messageType) {
            case 'FIRESTORE_GET_TRIGGERS':
            case 'FIRESTORE_ADD_TRIGGER':
            case 'FIRESTORE_VOTE':
            case 'FIRESTORE_ADD_FEEDBACK':
            case 'SIGN_IN_ANONYMOUSLY':
                {
                    // Use existing requestId or generate new
                    const reqIdForOffscreen = requestId || generateRequestId();
                    message.requestId = reqIdForOffscreen; // Ensure message HAS requestId before sending
                    console.log(`BG: Relaying ${messageType} to offscreen (ReqID: ${reqIdForOffscreen}). Storing callback.`);

                    pendingRequests.set(reqIdForOffscreen, sendResponse);

                    sendMessageToOffscreen(message).catch(error => {
                        console.error(`BG: Error occurred before/during sending ${messageType} (ReqID: ${reqIdForOffscreen}) to offscreen:`, error);
                        if (pendingRequests.has(reqIdForOffscreen)) {
                            const cb = pendingRequests.get(reqIdForOffscreen);
                             try { cb({ status: 'error', message: `Failed to send message to offscreen: ${error.message}` }); }
                             catch(e) { console.error(`BG: Error invoking error callback for ReqID ${reqIdForOffscreen}:`, e); }
                            pendingRequests.delete(reqIdForOffscreen);
                        }
                    });
                    return true; // Indicate async response
                }

            // --- Content Script Interaction (Forward to Content) ---
            // (Keep this section as is from previous version)
            case 'GET_VIDEO_STATE':
            case 'PLAY_VIDEO':
            case 'PAUSE_VIDEO':
                 if (isFromPopup) {
                      BROWSER_API.tabs.query({ active: true, currentWindow: true, url: "*://*.netflix.com/watch/*" }).then(tabs => {
                          const netflixTab = tabs?.[0];
                          if (netflixTab?.id) {
                               console.log(`BG: Forwarding ${messageType} from popup to content script (Tab ${netflixTab.id})`);
                               BROWSER_API.tabs.sendMessage(netflixTab.id, message)
                                  .then(response => {
                                       console.log(`BG: Response from content for ${messageType}:`, response);
                                       try { sendResponse(response); } catch (e) { console.error(`BG: Error sending content script response for ${messageType} back to popup:`, e); }
                                  })
                                  .catch(err => {
                                       console.error(`BG: Error forwarding ${messageType} to content script (Tab ${netflixTab.id}): ${err}`);
                                       try { sendResponse({ status: 'error', message: `Could not communicate with content script: ${err.message}` }); } catch (e) { /* Ignore */ }
                                  });
                          } else {
                               console.warn(`BG: Cannot forward ${messageType}, no active Netflix watch tab found.`);
                               try { sendResponse({ status: 'error', message: 'No active Netflix watch tab found.' }); } catch (e) { /* Ignore */ }
                          }
                      }).catch(err => {
                           console.error(`BG: Error querying tabs for ${messageType}:`, err);
                           try { sendResponse({ status: 'error', message: 'Error finding Netflix tab.' }); } catch (e) { /* Ignore */ }
                      });
                      return true; // Async
                 } else {
                      console.warn(`BG: Received ${messageType} from unexpected sender: ${senderOrigin}`);
                      return false;
                 }

            // --- UI Control (Directly Handle) ---
             // (Keep this section as is from previous version)
            case 'OPEN_POPUP':
                if (isFromContent) {
                    console.log("BG: Received OPEN_POPUP, attempting to open action popup.");
                    BROWSER_API.action.openPopup().catch(e => console.error("BG: Error opening popup:", e));
                } else { console.warn("BG: OPEN_POPUP received from non-content script."); }
                return false;
            case 'OPEN_OPTIONS':
                console.log("BG: Received OPEN_OPTIONS, opening options page.");
                BROWSER_API.runtime.openOptionsPage();
                return false;
            case 'OPEN_TAB':
                if (message.url) {
                    console.log(`BG: Received OPEN_TAB, opening URL: ${message.url}`);
                    BROWSER_API.tabs.create({ url: message.url });
                } else { console.warn("BG: Received OPEN_TAB without a URL."); }
                return false;

            // --- Background -> Content Script Broadcasts ---
             // (Keep this section as is from previous version)
            case 'PREFERENCES_UPDATED':
            case 'TRIGGER_ADDED_SUCCESS':
                 BROWSER_API.tabs.query({ url: "*://*.netflix.com/watch/*" }).then(tabs => {
                     tabs.forEach(tab => {
                         if (tab.id) {
                              console.log(`BG: Forwarding ${messageType} to content script Tab ${tab.id}`);
                             BROWSER_API.tabs.sendMessage(tab.id, message).catch(e => console.warn(`BG: Failed to send ${messageType} to tab ${tab.id}: ${e.message}`));
                         }
                     });
                 });
                 return false;

            default:
                console.warn(`BG: Unhandled message type from ${senderOrigin}: ${messageType}`);
                return false;
        }
    }
});


// --- Keepalive using Alarm API ---
const KEEPALIVE_ALARM_NAME = 'offscreen-keepalive-alarm';
async function setupKeepaliveAlarm() {
    try {
        const alarm = await BROWSER_API.alarms.get(KEEPALIVE_ALARM_NAME);
        if (!alarm) {
             console.log("BG: Setting up keepalive alarm.");
             BROWSER_API.alarms.create(KEEPALIVE_ALARM_NAME, { periodInMinutes: 1 });
              handleKeepaliveAlarm(); // Perform initial check
        } else {
             console.log("BG: Keepalive alarm already exists.");
        }
    } catch (e) {
         console.error("BG: Error setting up keepalive alarm:", e);
    }
}

async function handleKeepaliveAlarm(alarm) {
    if (alarm && alarm.name !== KEEPALIVE_ALARM_NAME) return;
    console.log("BG Keepalive: Alarm triggered. Checking/Creating offscreen document.");
    setupOffscreenDocument().catch(e => {
        console.error("BG: Keepalive failed to setup/ensure offscreen document:", e);
    });
}

BROWSER_API.alarms.onAlarm.addListener(handleKeepaliveAlarm);

// --- Initial setup on install/startup ---
BROWSER_API.runtime.onStartup.addListener(() => {
    console.log("BG: Extension startup.");
    setupKeepaliveAlarm();
});

BROWSER_API.runtime.onInstalled.addListener(details => {
    console.log("BG: Extension installed or updated.", details.reason);
    setupKeepaliveAlarm();
});

console.log("Background Service Worker initialized and listeners attached.");

// Initial check/creation
setupOffscreenDocument().catch(e => console.error("BG: Initial setupOffscreenDocument failed:", e));