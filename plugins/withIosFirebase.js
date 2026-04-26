const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Patches the generated Podfile to add :modular_headers => true for specific
 * Firebase/Google pods. Global use_modular_headers! breaks React Native's C++
 * pods (react_runtime redefinition). Targeted overrides fix Firebase without
 * touching RN pods.
 */
const FIREBASE_PODS = [
  'FirebaseCore',
  'FirebaseCoreInternal',
  'FirebaseInstallations',
  'FirebaseAnalytics',
  'FirebaseSessions',
  'GoogleAppMeasurement',
  'GoogleDataTransport',
  'GoogleUtilities',
  'nanopb',
  'PromisesObjC',
  'PromisesSwift',
];

const withIosFirebase = (config) => {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!podfile.includes('FirebaseCore, :modular_headers')) {
        const patch = FIREBASE_PODS.map(
          (pod) => `  pod '${pod}', :modular_headers => true`
        ).join('\n') + '\n';

        podfile = podfile.replace(
          /^(target .+ do\n)/m,
          `$1${patch}`
        );
        fs.writeFileSync(podfilePath, podfile);
      }

      return cfg;
    },
  ]);
};

module.exports = withIosFirebase;
