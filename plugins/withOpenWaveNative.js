const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Expo Config Plugin configuring Android permissions and Manifest entries
 * required by modules/openwave-native (Media3 foreground playback, DSP AudioEffect,
 * Bluetooth audio events, Android Auto media service & Google Cast).
 */
function withOpenWaveNative(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults;
    const ensurePermission = (permName) => {
      if (!manifest.manifest['uses-permission']) {
        manifest.manifest['uses-permission'] = [];
      }
      const exists = manifest.manifest['uses-permission'].some(
        (item) => item.$ && item.$['android:name'] === permName
      );
      if (!exists) {
        manifest.manifest['uses-permission'].push({
          $: { 'android:name': permName },
        });
      }
    };

    ensurePermission('android.permission.FOREGROUND_SERVICE');
    ensurePermission('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK');
    ensurePermission('android.permission.MODIFY_AUDIO_SETTINGS');
    ensurePermission('android.permission.BLUETOOTH_CONNECT');
    ensurePermission('android.permission.WAKE_LOCK');

    return modConfig;
  });
}

module.exports = withOpenWaveNative;

