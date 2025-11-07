// webpack.config.js
const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    // Keep other entries if you have them (like options, popup)
    'offscreen-bundle': './offscreen-wrapper.js' // Specific entry for the offscreen script
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname),
  },
  // Explicitly set environment to 'browser' to avoid Node.js assumptions
  target: 'web',
  // Optimization settings
  optimization: {
    // Prevent webpack from splitting the bundle
    splitChunks: {
      chunks: 'all',
      minSize: 0,
      cacheGroups: {
        default: false,
      },
    },
    // Ensure only one instance of Supabase client code
    runtimeChunk: false,
  }
};