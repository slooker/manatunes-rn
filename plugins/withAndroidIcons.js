const { withDangerousMod } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Copies the ManaTunes mipmap icon directories from the source assets/icons/
 * directory into the generated Android project after expo prebuild.
 * This preserves the exact same icons from the Kotlin app across prebuild --clean runs.
 *
 * To use: copy the mipmap-* directories from the Kotlin app's
 * androidApp/src/main/res/ into manatunes-rn/assets/icons/
 */
const withAndroidIcons = (config) => {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const sourceIconsDir = path.join(cfg.modRequest.projectRoot, 'assets', 'icons');
      const destResDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      const launcherBaseNames = ['ic_launcher', 'ic_launcher_foreground', 'ic_launcher_round'];

      if (!fs.existsSync(sourceIconsDir)) {
        // No icons directory yet — skip silently (will use Expo defaults)
        return cfg;
      }

      const densityDirs = fs.readdirSync(sourceIconsDir).filter((d) => d.startsWith('mipmap-'));
      for (const dir of densityDirs) {
        const srcDir = path.join(sourceIconsDir, dir);
        const destDir = path.join(destResDir, dir);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        for (const baseName of launcherBaseNames) {
          for (const ext of ['png', 'webp', 'xml']) {
            const existingFile = path.join(destDir, `${baseName}.${ext}`);
            if (fs.existsSync(existingFile)) {
              fs.rmSync(existingFile, { force: true });
            }
          }
        }
        for (const file of fs.readdirSync(srcDir)) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      }

      return cfg;
    },
  ]);
};

module.exports = withAndroidIcons;
