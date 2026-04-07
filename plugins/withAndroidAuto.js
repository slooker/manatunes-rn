const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Injects Android Auto support into the AndroidManifest and copies
 * automotive_app_desc.xml into the res/xml directory.
 * This survives expo prebuild --clean.
 */
const withAndroidAuto = (config) => {
  // Step 1: Inject meta-data and queries into AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const application = manifest.manifest.application[0];

    // Add automotive meta-data if not already present
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }
    const hasAutoMeta = application['meta-data'].some(
      (m) => m.$?.['android:name'] === 'com.google.android.gms.car.application'
    );
    if (!hasAutoMeta) {
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.android.gms.car.application',
          'android:resource': '@xml/automotive_app_desc',
        },
      });
    }

    if (!application.service) {
      application.service = [];
    }
    const hasAutoService = application.service.some(
      (s) => s.$?.['android:name'] === '.AndroidAutoMediaService'
    );
    if (!hasAutoService) {
      application.service.push({
        $: {
          'android:name': '.AndroidAutoMediaService',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.media.browse.MediaBrowserService' } }],
          },
        ],
      });
    }

    // Add <queries> for MediaBrowserService discovery if not present
    if (!manifest.manifest.queries) {
      manifest.manifest.queries = [];
    }
    const hasQuery = manifest.manifest.queries.some(
      (q) => q.intent?.[0]?.action?.[0]?.$?.['android:name'] === 'android.media.browse.MediaBrowserService'
    );
    if (!hasQuery) {
      manifest.manifest.queries.push({
        intent: [
          {
            action: [{ $: { 'android:name': 'android.media.browse.MediaBrowserService' } }],
          },
        ],
        package: [{ $: { 'android:name': 'com.google.android.projection.gearhead' } }],
      });
    }

    return cfg;
  });

  // Step 2: Copy automotive_app_desc.xml into res/xml
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }
      const destFile = path.join(xmlDir, 'automotive_app_desc.xml');
      if (!fs.existsSync(destFile)) {
        fs.writeFileSync(
          destFile,
          `<?xml version="1.0" encoding="utf-8"?>\n<automotiveApp>\n    <uses name="media" />\n</automotiveApp>\n`
        );
      }
      return cfg;
    },
  ]);

  return config;
};

module.exports = withAndroidAuto;
