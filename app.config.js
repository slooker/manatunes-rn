module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    // On EAS Build the secret is injected as a file and the env var holds its path.
    // Locally the file lives at the repo root (gitignored).
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST || './GoogleService-Info.plist',
  },
});
