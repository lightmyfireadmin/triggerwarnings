try {
    console.log('--- Checking firebase-functions/v2/https ---');
    // Try resolving the specific module path
    const v2HttpsPath = require.resolve('firebase-functions/v2/https');
    console.log('Resolved path:', v2HttpsPath);

    // Try requiring it and accessing the 'https' export
    const { https } = require('firebase-functions/v2/https');
    console.log('Type of { https } object after require:', typeof https);

    // Check if the 'https' object exists and has the 'onRequest' property
    if (https) {
        console.log('Does https.onRequest exist?', (typeof https.onRequest === 'function'));
    } else {
        console.log('!!! The imported https object is undefined or null !!!');
    }
    console.log('--- Check complete ---');

} catch (e) {
    console.error("Error resolving or requiring firebase-functions/v2/https:", e);
}