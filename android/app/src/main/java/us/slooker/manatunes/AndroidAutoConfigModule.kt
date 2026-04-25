package us.slooker.manatunes

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AndroidAutoConfigModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AndroidAutoConfig"

  @ReactMethod
  fun setActiveServer(id: String, name: String, url: String, username: String, password: String) {
    reactContext.getSharedPreferences(PREFS_NAME, 0)
      .edit()
      .putString(KEY_ID, id)
      .putString(KEY_NAME, name)
      .putString(KEY_URL, url.trimEnd('/'))
      .putString(KEY_USERNAME, username)
      .putString(KEY_PASSWORD, password)
      .apply()
  }

  @ReactMethod
  fun clearActiveServer() {
    reactContext.getSharedPreferences(PREFS_NAME, 0).edit().clear().apply()
  }

  @ReactMethod
  fun setDownloadedAlbums(json: String) {
    reactContext.getSharedPreferences(PREFS_NAME, 0)
      .edit()
      .putString(KEY_DOWNLOADED_ALBUMS, json)
      .apply()
  }

  @ReactMethod
  fun setReplayGainMode(mode: String) {
    reactContext.getSharedPreferences(PREFS_NAME, 0)
      .edit()
      .putString(KEY_REPLAY_GAIN, mode)
      .apply()
  }

  companion object {
    const val PREFS_NAME = "manatunes_android_auto"
    const val KEY_ID = "id"
    const val KEY_NAME = "name"
    const val KEY_URL = "url"
    const val KEY_USERNAME = "username"
    const val KEY_PASSWORD = "password"
    const val KEY_DOWNLOADED_ALBUMS = "downloaded_albums"
    const val KEY_REPLAY_GAIN = "replay_gain"
  }
}
