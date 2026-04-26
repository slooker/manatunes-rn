const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Patches the generated Podfile to add modular_headers for Google pods
 * required by @react-native-firebase. Without this, pod install fails with:
 * "FirebaseCoreInternal depends upon GoogleUtilities, which does not define modules."
 */
const withIosFirebase = (config) => {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const patch = `
  pod 'GoogleUtilities', :modular_headers => true
  pod 'GoogleDataTransport', :modular_headers => true
`;

      if (!podfile.includes('GoogleUtilities, :modular_headers')) {
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
