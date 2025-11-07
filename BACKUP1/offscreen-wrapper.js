// offscreen-wrapper.js (v1.1.1 - Added Listener Guard)
import { createClient } from '@supabase/supabase-js';

console.log("OFFSCREEN: Starting (Bundled Version)...");

let messageListenerAttached = false; // Guard flag

const SUPABASE_URL = 'https://qasvqvtoyrucrwshojzd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhc3ZxdnRveXJ1Y3J3c2hvanpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3Mjk5NzIsImV4cCI6MjA2MDMwNTk3Mn0.4HaleG-RqyEp-TgJ1Zhalm455AyN2nM57nDBa7iNHmY';
let supabase;
let isSupabaseInitialized = false;
let initializationError = null;
let currentUserId = null;
let currentSession = null;

const statusElement = document.getElementById('status');

function updateStatus(message, isError = false) {
    console.log(`OFFSCREEN STATUS: ${message}`);
    if (statusElement) {
        try {
            statusElement.textContent = message;
            statusElement.style.color = isError ? 'red' : 'green';
        } catch(e) {
            console.warn("Offscreen: Failed to update status element:", e);
        }
    }
}

function initialize() {
    console.log("OFFSCREEN: Initializing Supabase client...");
    try {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('<')) {
            throw new Error("Supabase URL or Anon Key is missing or invalid.");
        }
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
             auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
         });
        isSupabaseInitialized = true;
        updateStatus("Supabase client initialized.", false);
        console.log("OFFSCREEN: Supabase client created successfully.");
        chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" })
            .catch(e => console.warn("OFFSCREEN: Error sending READY signal:", e));
        setupMessageHandlers();
    } catch (error) {
        console.error("OFFSCREEN: Initialization Error:", error);
        initializationError = error.message;
        isSupabaseInitialized = false;
        updateStatus(`Error: ${error.message}`, true);
        chrome.runtime.sendMessage({ type: "INIT_ERROR", error: error.message })
             .catch(e => console.warn("OFFSCREEN: Error sending INIT_ERROR:", e));
    }
}

// --- MODIFIED: setupMessageHandlers with hasListener check ---
function setupMessageHandlers() {
    // Check if a listener for onMessage is already registered for this context
    if (chrome.runtime.onMessage.hasListener(handleIncomingMessages)) {
        console.log("OFFSCREEN: Message listener (handleIncomingMessages) already attached. Skipping.");
        return;
    }
    // Add the listener
    chrome.runtime.onMessage.addListener(handleIncomingMessages);
    // Set flag immediately after successfully adding
    messageListenerAttached = true; // Set flag here
    console.log("OFFSCREEN: Message listener (handleIncomingMessages) added successfully.");
}

// --- NEW: Moved the listener logic into its own named function ---
function handleIncomingMessages(message, sender, sendResponse) {
    const messageType = message?.type || 'unknown';
    const requestId = message.requestId; // Get ID passed from background
    console.log(`OFFSCREEN Received: ${messageType}${requestId ? ` (ReqID: ${requestId})`: ' (No ReqID!)'}`); // Log if ID is missing

    // Prevent processing during initialization errors (unless ping)
    if (initializationError && messageType !== 'OFFSCREEN_PING') {
         console.error(`OFFSCREEN: Not processing ${messageType} due to initialization error: ${initializationError}`);
         sendResultToBackground(messageType, { status: "error", message: `Offscreen document initialization failed: ${initializationError}` }, requestId);
         return false; // Indicate sync handling (error response sent)
    }
     // Prevent processing if Supabase isn't ready (unless ping)
     if (!isSupabaseInitialized && messageType !== 'OFFSCREEN_PING') {
         console.error(`OFFSCREEN: Not processing ${messageType} because Supabase client is not initialized.`);
         sendResultToBackground(messageType, { status: "error", message: "Supabase client not initialized in offscreen document." }, requestId);
         return false; // Indicate sync handling (error response sent)
     }

    // --- Route message to appropriate handler ---
    let isAsync = false; // Flag to determine return value

    switch (messageType) {
        case "FIRESTORE_GET_TRIGGERS":
            handleGetTriggers(message.videoId, requestId) // Pass requestId
                .then(result => sendResultToBackground(messageType, result, requestId, message.videoId))
                .catch(error => sendErrorToBackground(messageType, error, requestId, message.videoId));
            isAsync = true;
            break;
        case "FIRESTORE_ADD_TRIGGER":
            handleAddTrigger(message.data, requestId) // Pass requestId
                .then(result => sendResultToBackground(messageType, result, requestId))
                .catch(error => sendErrorToBackground(messageType, error, requestId));
            isAsync = true;
            break;
        case "FIRESTORE_VOTE":
            handleVote(message.data, requestId) // Pass requestId
                .then(result => sendResultToBackground(messageType, result, requestId))
                .catch(error => sendErrorToBackground(messageType, error, requestId));
            isAsync = true;
            break;
        case "FIRESTORE_ADD_FEEDBACK":
            handleAddFeedback(message.data, requestId) // Pass requestId
                .then(result => sendResultToBackground(messageType, result, requestId))
                .catch(error => sendErrorToBackground(messageType, error, requestId));
            isAsync = true;
            break;
        case "SIGN_IN_ANONYMOUSLY":
            console.warn("OFFSCREEN: Explicit SIGN_IN_ANONYMOUSLY request received, assuming implicit sign-in is sufficient.");
            sendResultToBackground(messageType, { status: 'success', message: 'Implicit anonymous sign-in used.' }, requestId);
            isAsync = false; // Sync response
            break;
        case "OFFSCREEN_PING":
            // Respond directly to the background's sendResponse
            if (typeof sendResponse === 'function') {
                 try { sendResponse({ status: "success", message: "pong" }); } catch (e) { console.warn("OFFSCREEN: Error calling sendResponse for PING:", e); }
            } else {
                 console.warn("OFFSCREEN: Received PING without a valid sendResponse function.");
            }
            isAsync = false; // Treat as sync for return value consistency
            break;
        default:
            // Ignore messages clearly not meant for offscreen (like UI actions)
             if (!['OPEN_POPUP', 'OPEN_OPTIONS', 'OPEN_TAB'].includes(messageType)) {
                console.warn(`OFFSCREEN: Unhandled message type received: ${messageType}`);
                // Send error ONLY for unrecognized data/action messages
                sendErrorToBackground(messageType, new Error(`Unhandled message type: ${messageType}`), requestId);
            } else {
                 console.log(`OFFSCREEN: Ignoring background/UI message type: ${messageType}`);
            }
            isAsync = false;
            break;
    }

    return isAsync; // Return true only if we started an async operation
}
// --- End Message Handling ---


// Helper Functions (sendResultToBackground, sendErrorToBackground)
function sendResultToBackground(originalType, result, requestId, videoId = null) {
    if (!requestId) { console.error(`OFFSCREEN: Attempted to send SUCCESS result for ${originalType} WITHOUT ReqID!`, result); return; }
    console.log(`OFFSCREEN: Preparing to send SUCCESS result for ${originalType}. ReqID: ${requestId}`, result);
    const message = { type: "OPERATION_RESULT", originalType, result, requestId };
    if (videoId) message.videoId = videoId;
    chrome.runtime.sendMessage(message)
         .catch(e => console.error(`OFFSCREEN: Error sending result for ${originalType} (ReqID: ${requestId}) to background:`, e));
}
function sendErrorToBackground(originalType, error, requestId, videoId = null) {
     if (!requestId) { console.error(`OFFSCREEN: Attempted to send ERROR result for ${originalType} WITHOUT ReqID! Error:`, error.message); return; }
    console.error(`OFFSCREEN: Preparing to send ERROR result for ${originalType} (ReqID: ${requestId}) to background:`, error.message);
    const message = { type: "OPERATION_RESULT", originalType, result: { status: "error", message: `Offscreen operation ${originalType} failed: ${error.message}`, code: error.code }, requestId };
     if (videoId) message.videoId = videoId;
    chrome.runtime.sendMessage(message)
        .catch(e => console.error(`OFFSCREEN: Error sending error result for ${originalType} (ReqID: ${requestId}) to background:`, e));
}

// Supabase Operation Handlers
async function ensureUserId() {
    if (currentUserId) return currentUserId;
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) console.warn("OFFSCREEN: Error getting session:", sessionError.message);
        if (session?.user?.id) {
            console.log("OFFSCREEN: Found existing session. User ID:", session.user.id.substring(0, 8) + "...");
            currentUserId = session.user.id; currentSession = session; return currentUserId;
        } else {
            console.log("OFFSCREEN: No active session, attempting anonymous sign-in..."); updateStatus("Authenticating...");
            const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
            if (authError) throw new Error(`Anonymous sign-in failed: ${authError.message}`);
            if (!authData?.user?.id) throw new Error("Anonymous sign-in succeeded but no user data received.");
            currentUserId = authData.user.id; currentSession = authData.session;
            console.log("OFFSCREEN: Anonymous sign-in successful. User ID:", currentUserId.substring(0, 8) + "..."); updateStatus(`Authenticated Anon: ${currentUserId.substring(0, 8)}...`); return currentUserId;
        }
    } catch (error) { console.error("OFFSCREEN: Failed to ensure user ID:", error); updateStatus(`Authentication Error: ${error.message}`, true); throw error; }
}
async function handleGetTriggers(videoId, requestId) {
    if (!videoId) return { status: "error", message: "Missing videoId for getTriggers" };
    try {
        console.log(`OFFSCREEN: Querying triggers for video_id: ${videoId} (ReqID: ${requestId})`);
        const { data, error, status } = await supabase.from('triggers').select('*').eq('video_id', videoId).eq('status', 'approved');
        if (error) throw error;
        console.log(`OFFSCREEN: Found ${data?.length ?? 0} triggers for videoId ${videoId}. Status: ${status} (ReqID: ${requestId})`);
        return { status: "success", videoId, triggers: data || [] };
    } catch (error) {
        console.error(`OFFSCREEN: Error fetching triggers for videoId ${videoId} (ReqID: ${requestId}):`, error); updateStatus(`Error fetching triggers: ${error.message}`, true);
        const userMessage = (error.code === 'PGRST' && error.message.includes('JWT')) ? "Permission denied (Auth Issue)." : `Supabase fetch error: ${error.message}`;
        return { status: "error", message: userMessage, code: error.code };
    }
}
async function handleAddTrigger(triggerData, requestId) {
     if (!triggerData) return { status: "error", message: "Missing trigger data" };
     const { videoId, categoryKey, startTime, endTime } = triggerData;
     if (!videoId || !categoryKey || typeof startTime !== 'number' || typeof endTime !== 'number' || endTime <= startTime) {
         console.error("OFFSCREEN: Invalid trigger data received:", triggerData); let detail = "Invalid trigger data."; if (endTime <= startTime) detail = "End time must be after start time."; if (!videoId) detail = "Missing videoId."; if (!categoryKey) detail = "Missing categoryKey."; if (typeof startTime !== 'number' || typeof endTime !== 'number') detail = "Start/End times must be numbers."; return { status: "error", message: detail };
     }
    try {
        const userId = await ensureUserId();
        console.log(`OFFSCREEN: Adding trigger for video ${videoId} (ReqID: ${requestId}) by user ${userId.substring(0,8)}...`);
        const docToAdd = { video_id: videoId, category_key: categoryKey, start_time: startTime, end_time: endTime, submitted_by: userId, status: 'approved', score: 0 };
        console.log("OFFSCREEN: Inserting trigger data:", docToAdd);
        const { data, error } = await supabase.from('triggers').insert(docToAdd).select('id').single();
        if (error) throw error;
        const newTriggerId = data?.id; if (!newTriggerId) throw new Error("Insert succeeded but did not return an ID.");
        console.log(`OFFSCREEN: Trigger added successfully. ID: ${newTriggerId} (ReqID: ${requestId})`); updateStatus(`Trigger added for video ${videoId}`);
        return { status: "success", triggerId: newTriggerId, message: "Trigger added successfully" };
    } catch (error) {
        console.error(`OFFSCREEN: Error adding trigger for video ${videoId} (ReqID: ${requestId}):`, error); updateStatus(`Error adding trigger: ${error.message}`, true); let userMessage = `Supabase insert error: ${error.message}`; if (error.code === 'PGRST' && error.message.includes('JWT')) userMessage = "Permission denied (Auth Issue)."; if (error.code === '23514' && error.message.includes('end_time_after_start_time')) userMessage = "End time must be after start time."; if (error.code === '42501') userMessage = "Permission Denied (Check RLS/Policy)."; return { status: "error", message: userMessage, code: error.code };
    }
}
async function handleVote(voteData, requestId) {
    if (!voteData?.triggerId || !['up', 'down'].includes(voteData.voteType)) return { status: "error", message: "Invalid vote data" };
    const { triggerId, voteType } = voteData;
    try {
        const userId = await ensureUserId();
        console.log(`OFFSCREEN: Processing ${voteType} vote for trigger ${triggerId} by user ${userId.substring(0,8)}... (ReqID: ${requestId})`);
        const { error } = await supabase.rpc('handle_vote', { trigger_id_in: triggerId, user_id_in: userId, vote_type_in: voteType });
        if (error) throw error;
        console.log(`OFFSCREEN: Vote ${voteType} recorded successfully for trigger ${triggerId} (ReqID: ${requestId})`); updateStatus(`Vote recorded for trigger ${triggerId}`);
        return { status: "success", message: "Vote recorded successfully" };
    } catch (error) {
        console.error(`OFFSCREEN: Error recording vote for trigger ${triggerId} (ReqID: ${requestId}):`, error); updateStatus(`Error recording vote: ${error.message}`, true); let userMessage = `Supabase RPC error: ${error.message}`; if (error.code === 'PGRST' && error.message.includes('JWT')) userMessage = "Permission denied (Auth Issue)."; if (error.code === '42501') userMessage = "Permission Denied (Check Function Security/RLS)."; return { status: "error", message: userMessage, code: error.code };
    }
}
async function handleAddFeedback(feedbackData, requestId) {
    if (!feedbackData?.message) return { status: "error", message: "Invalid feedback data (message required)" };
    let submitterId = null;
    try {
         const { data: { session } } = await supabase.auth.getSession();
         if (session?.user?.id) { submitterId = session.user.id; console.log(`OFFSCREEN: Submitting feedback as user ${submitterId.substring(0,8)}...`); }
         else { console.log("OFFSCREEN: Submitting feedback anonymously (no active session)."); }
    } catch (authError) { console.warn("OFFSCREEN: Error checking auth state before submitting feedback, submitting anonymously.", authError.message); submitterId = null; }
    console.log(`OFFSCREEN: Attempting to add feedback (ReqID: ${requestId}). Auth'd: ${!!submitterId}`);
    try {
        const docToAdd = { name: feedbackData.name || null, email: feedbackData.email || null, message: feedbackData.message, submitted_by: submitterId };
        const { error } = await supabase.from('feedback').insert(docToAdd); if (error) throw error;
        console.log("OFFSCREEN: Feedback submitted successfully."); updateStatus("Feedback submitted.");
        return { status: "success", message: "Feedback submitted successfully" };
    } catch (error) {
        console.error(`OFFSCREEN: Error adding feedback (ReqID: ${requestId}):`, error); updateStatus(`Error submitting feedback: ${error.message}`, true); let userMessage = `Supabase insert error: ${error.message}`; if (error.code === 'PGRST' && error.message.includes('JWT')) userMessage = "Permission denied (Auth Issue)."; if (error.code === '42501') userMessage = "Permission Denied (Check RLS policies)."; return { status: "error", message: userMessage, code: error.code };
    }
}

// Keep Alive & Unload
window.addEventListener('unload', () => { console.log("OFFSCREEN: Unloading..."); });
window.addEventListener('DOMContentLoaded', initialize);
updateStatus("Offscreen script loaded. Waiting for DOMContentLoaded...", false);
console.log("OFFSCREEN: Script execution finished. Waiting for DOMContentLoaded to initialize.");