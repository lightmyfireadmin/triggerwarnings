try {
  const functionsPath = require.resolve("firebase-functions");
  console.log("--- Checking firebase-functions ---");
  console.log("Resolved path:", functionsPath);

  const functions = require("firebase-functions");
  console.log("Type of functions object:", typeof functions);

  // Check for the specific properties used in V2 syntax
  console.log("Does functions.region exist?", (typeof functions.region === "function"));
  console.log("Does functions.https exist?", (typeof functions.https === "object"));
  console.log("--- Check complete ---");
} catch (e) {
  console.error("Error resolving or requiring firebase-functions:", e);
}
