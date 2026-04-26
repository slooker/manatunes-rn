const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Patches the generated Podfile to enable use_modular_headers! globally.
 * Required by @react-native-firebase — Firebase pods (FirebaseCore,
 * FirebaseInstallations, GoogleUtilities, etc.) need module maps to be
 * importable from Swift when built as static libraries.
 */
const withIosFirebase = (config) => {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!podfile.includes('use_modular_headers!')) {
        podfile = podfile.replace(
          /^(platform :ios,.+\n)/m,
          `$1\nuse_modular_headers!\n`
        );
        fs.writeFileSync(podfilePath, podfile);
      }

      return cfg;
    },
  ]);
};

module.exports = withIosFirebase;
