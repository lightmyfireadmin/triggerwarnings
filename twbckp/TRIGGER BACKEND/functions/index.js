// index.js - Explicit V2 Syntax - Line Length < 75

// Import V2 trigger/options & other modules
const {https} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
// Enable CORS for all origins
// --- Set Global Options ---
setGlobalOptions({region: "europe-west1"});
// --- Initialization ---
try {
  admin.initializeApp();
  console.log("TopLevel: Firebase Admin SDK initialized (V2).");
} catch (error) {
  // Avoid crashing on warm starts if app already exists
  if (error.code !== "app/duplicate-app") {
    console.error(
        "TopLevel: Error initializing Firebase Admin SDK:",
        error,
    );
  }
}
const db = admin.firestore();
console.log("TopLevel: Firestore reference obtained (V2).");

// --- HTTP Function: getTriggers (V2 Syntax) ---
// Use the imported 'https' object.
// Built-in CORS option handles simple cases.
exports.getTriggers = https.onRequest(
    {cors: true}, // V2 CORS option
    async (request, response) => {
    // Note: Keep the cors() middleware wrapper if {cors: true}
    // isn't sufficient for your specific header needs.
    // cors(request, response, async () => { // Optional wrapper

      // Log function start and region
      console.log(
          "MinimalDebug: getTriggers (V2) started in region:",
          process.env.FUNCTION_REGION,
      );

      // --- Direct Document Read ---
      const specificDocId = "90BobpZ1kx47cuF7101Q";
      const collectionName = "triggers"; // Case-sensitive!

      // Log read attempt details
      console.log(
          `Attempting read: Col='${collectionName}',`,
          `Doc='${specificDocId}'`,
      );

      // Check Firestore reference
      if (!db) {
        console.error(
            "MinimalDebug: Firestore db reference missing!",
        );
        return response.status(500).json({
          status: "error",
          error: "Internal Server Error: DB unavailable.",
        });
      }

      try {
      // Get document reference and snapshot
        const docRef = db
            .collection(collectionName)
            .doc(specificDocId);
        const docSnap = await docRef.get();

        // --- Check if document exists ---
        if (docSnap.exists) {
          const docData = docSnap.data();
          console.log(
              `MinimalDebug: SUCCESS! Doc found. ID: ${docSnap.id}.`,
          );
          // console.log( // Uncomment for detailed data logging
          //   "MinimalDebug: Doc data:",
          //   JSON.stringify(docData)
          // );

          // Send success response with data
          return response.status(200).json({
            status: "success",
            message: `Read doc ${specificDocId} ok.`,
            data: docData,
          });
        } else {
        // FAILURE CASE: Document not found
          console.error(
              `MinimalDebug: FAIL! Doc '${specificDocId}' not found.`,
          );
          return response.status(404).json({
            status: "error",
            error: `Document not found: ${specificDocId}`,
          });
        }
      } catch (error) {
      // FAILURE CASE: Error during Firestore read
        console.error(
            `MinimalDebug: CATCH! Error reading doc '${specificDocId}':`,
            error, // Log the full error object
        );

        // Extract error details safely
        const errorCode = error.code || "UNKNOWN_DB_ERROR";
        const errorMsg = error.message || "Unknown DB read error.";

        // Send generic server error response
        return response.status(500).json({
          status: "error",
          error: `Internal Server Error (Code: ${errorCode})`,
          details: errorMsg,
        });
      }
    // }); // End optional cors() wrapper
    }, // End onRequest handler
); // End function definition
