// webpack.config.js
const path = require('path');

module.exports = {
  mode: 'production', // Use 'development' for easier debugging if needed
  entry: {
    // Keep other entries if you have them (like options, popup)
    'offscreen-bundle': './offscreen-wrapper.js' // Specific entry for the offscreen script
  },
  output: {
    filename: '[name].js', // Output will be 'offscreen-bundle.js'
    path: path.resolve(__dirname),
  },
  // Add resolve configuration for modules like 'ws' if needed by Supabase dependencies,
  // although Supabase V2 aims to be more browser-friendly. Let's try without first.
  // You might need 'devtool: 'inline-source-map'' for development builds.
};