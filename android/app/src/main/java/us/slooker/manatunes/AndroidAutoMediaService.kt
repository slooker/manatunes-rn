package us.slooker.manatunes

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.media.MediaBrowserServiceCompat
import androidx.media.utils.MediaConstants
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.security.MessageDigest
import kotlin.concurrent.thread
import org.json.JSONArray
import org.json.JSONObject

class AndroidAutoMediaService : MediaBrowserServiceCompat() {
  private lateinit var mediaSession: MediaSessionCompat
  private val mainHandler = Handler(Looper.getMainLooper())
  private val audioManager by lazy { getSystemService(Context.AUDIO_SERVICE) as AudioManager }
  private var audioFocusRequest: AudioFocusRequest? = null
  private var mediaPlayer: MediaPlayer? = null
  private var queue: List<AutoSong> = emptyList()
  private var queueIndex = -1
  private var restoredPositionMs: Long? = null
  private val childrenCache = mutableMapOf<String, MutableList<MediaBrowserCompat.MediaItem>>()
  private var playbackState = PlaybackStateCompat.STATE_NONE
  private var currentDurationMs: Long? = null
  private var progressTickCount = 0
  private val progressRunnable = object : Runnable {
    override fun run() {
      val player = mediaPlayer
      if (player == null || playbackState != PlaybackStateCompat.STATE_PLAYING) return

      val position = player.safeCurrentPosition()
      val duration = currentDurationMs ?: player.safeDuration()
      if (duration != null && position >= duration - COMPLETION_ADVANCE_EARLY_MS) {
        advanceAfterCompletion()
        return
      }

      updatePlaybackState(PlaybackStateCompat.STATE_PLAYING)

      // Persist position every ~30 seconds so a sudden process kill loses minimal progress
      progressTickCount++
      if (progressTickCount % QUEUE_SAVE_INTERVAL_TICKS == 0) {
        saveQueueState()
      }

      mainHandler.postDelayed(this, PROGRESS_UPDATE_INTERVAL_MS)
    }
  }

  override fun onCreate() {
    super.onCreate()

    mediaSession = MediaSessionCompat(this, "ManaTunesAndroidAuto").apply {
      setFlags(
        MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
          MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
      )
      setCallback(object : MediaSessionCompat.Callback() {
        override fun onPlay() = resume()
        override fun onPause() = pause()
        override fun onStop() = stop()
        override fun onSkipToNext() = skipTo(queueIndex + 1)
        override fun onSkipToPrevious() = rewindOrPrevious()
        override fun onFastForward() = skipTo(queueIndex + 1)
        override fun onRewind() = rewindOrPrevious()
        override fun onSeekTo(pos: Long) = seekTo(pos)

        override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) {
          if (mediaId == null) return
          playFromMediaId(mediaId)
        }

        override fun onPlayFromSearch(query: String?, extras: Bundle?) {
          if (query.isNullOrBlank()) return
          playFirstSearchResult(query)
        }
      })
      isActive = true
    }

    sessionToken = mediaSession.sessionToken
    updatePlaybackState(PlaybackStateCompat.STATE_NONE)
    restoreQueueState()
  }

  override fun onDestroy() {
    saveQueueState()
    stopProgressUpdates()
    mediaPlayer?.release()
    abandonAudioFocus()
    mediaSession.release()
    super.onDestroy()
  }

  override fun onTaskRemoved(rootIntent: android.content.Intent?) {
    saveQueueState()
    super.onTaskRemoved(rootIntent)
  }

  override fun onGetRoot(clientPackageName: String, clientUid: Int, rootHints: Bundle?): BrowserRoot {
    val extras = Bundle().apply {
      putBoolean(MediaConstants.BROWSER_SERVICE_EXTRAS_KEY_SEARCH_SUPPORTED, true)
    }
    return BrowserRoot(ROOT_ID, extras)
  }

  override fun onLoadChildren(parentId: String, result: Result<MutableList<MediaBrowserCompat.MediaItem>>) {
    val cached = childrenCache[parentId]
    if (cached != null) {
      result.sendResult(cached)
      // Refresh the cache in the background for next time
      thread(name = "ManaTunesAndroidAutoBrowse") {
        try {
          val fresh = loadChildren(parentId)
          childrenCache[parentId] = fresh
        } catch (_: Exception) { }
      }
      return
    }

    result.detach()
    thread(name = "ManaTunesAndroidAutoBrowse") {
      val items = try {
        loadChildren(parentId)
      } catch (e: Exception) {
        if (isPlaybackActive()) {
          rootItems()
        } else {
          mutableListOf(errorItem("Could not load ManaTunes", e.message ?: "Unknown error"))
        }
      }
      childrenCache[parentId] = items
      result.sendResult(items)
    }
  }

  override fun onSearch(query: String, extras: Bundle?, result: Result<MutableList<MediaBrowserCompat.MediaItem>>) {
    result.detach()
    thread(name = "ManaTunesAndroidAutoSearch") {
      val items = try {
        val client = createClientFromPrefs() ?: return@thread result.sendResult(noServerItems())
        val search = client.search3(query)
        val songs = search.optJSONArray("song").orEmptyObjects().map(::songFromJson)
        val albums = search.optJSONArray("album").orEmptyObjects().map(::albumFromJson)
        val artists = search.optJSONArray("artist").orEmptyObjects().map(::artistFromJson)
        mutableListOf<MediaBrowserCompat.MediaItem>().apply {
          addAll(artists.map { artistItem(it) })
          addAll(albums.map { albumItem(it, "${PREFIX_ALBUM}${it.id}") })
          addAll(songs.map { songItem(it, "${PREFIX_SEARCH_SONG}${it.id}${MEDIA_ID_SEPARATOR}${query}") })
        }
      } catch (e: Exception) {
        mutableListOf(errorItem("Search failed", e.message ?: "Unknown error"))
      }
      result.sendResult(items)
    }
  }

  private fun loadChildren(parentId: String): MutableList<MediaBrowserCompat.MediaItem> {
    val client = createClientFromPrefs() ?: return noServerItems()

    return when {
      parentId == ROOT_ID -> rootItems()

      parentId == MEDIA_ID_ARTISTS ->
        client.getArtists().map(::artistFromJson).map(::artistItem).toMutableList()

      parentId == MEDIA_ID_ALBUMS ->
        client.getAlbumList2("alphabeticalByName", 250)
          .map(::albumFromJson)
          .map { albumItem(it, "${PREFIX_ALBUM}${it.id}") }
          .toMutableList()

      parentId == MEDIA_ID_FAVORITES -> mutableListOf(
        browseItem(MEDIA_ID_FAVORITE_ARTISTS, "Favorite Artists", "Artists starred in Navidrome"),
        browseItem(MEDIA_ID_FAVORITE_ALBUMS, "Favorite Albums", "Albums starred in Navidrome"),
        browseItem(MEDIA_ID_FAVORITE_SONGS, "Favorite Songs", "Songs starred in Navidrome")
      )

      parentId == MEDIA_ID_FAVORITE_ARTISTS ->
        client.getStarred2().optJSONArray("artist").orEmptyObjects().map(::artistFromJson).map(::artistItem).toMutableList()

      parentId == MEDIA_ID_FAVORITE_ALBUMS ->
        client.getStarred2().optJSONArray("album").orEmptyObjects().map(::albumFromJson).map { albumItem(it, "${PREFIX_ALBUM}${it.id}") }.toMutableList()

      parentId == MEDIA_ID_FAVORITE_SONGS ->
        client.getStarred2().optJSONArray("song").orEmptyObjects().map(::songFromJson).map { song ->
          songItem(song, "${PREFIX_FAVORITE_SONG}${song.id}")
        }.toMutableList()

      parentId == MEDIA_ID_GENRES ->
        client.getGenres().map(::genreFromJson).map(::genreItem).toMutableList()

      parentId.startsWith(PREFIX_GENRE) -> {
        val genreName = parentId.removePrefix(PREFIX_GENRE)
        client.getSongsByGenre(genreName, 200)
          .map(::songFromJson)
          .map { song -> songItem(song, "${PREFIX_GENRE_SONG}${song.id}${MEDIA_ID_SEPARATOR}${genreName}") }
          .toMutableList()
      }

      parentId == MEDIA_ID_DOWNLOADED -> downloadedItems()

      parentId.startsWith(PREFIX_DOWNLOADED_ALBUM) -> {
        val albumId = parentId.removePrefix(PREFIX_DOWNLOADED_ALBUM)
        downloadedAlbums()
          .firstOrNull { it.id == albumId }
          ?.songs
          ?.map(::downloadedSongItem)
          ?.toMutableList()
          ?: mutableListOf()
      }

      parentId.startsWith(PREFIX_ARTIST) -> {
        val artistId = parentId.removePrefix(PREFIX_ARTIST)
        client.getArtist(artistId)
          .optJSONArray("album")
          .orEmptyObjects()
          .map(::albumFromJson)
          .map { albumItem(it, "${PREFIX_ALBUM}${it.id}") }
          .toMutableList()
      }

      parentId.startsWith(PREFIX_ALBUM) -> {
        val albumId = parentId.removePrefix(PREFIX_ALBUM)
        client.getAlbum(albumId)
          .optJSONArray("song")
          .orEmptyObjects()
          .map(::songFromJson)
          .map { song -> songItem(song, "${PREFIX_ALBUM_SONG}${albumId}${MEDIA_ID_SEPARATOR}${song.id}") }
          .toMutableList()
      }

      else -> mutableListOf()
    }
  }

  private fun playFromMediaId(mediaId: String) {
    thread(name = "ManaTunesAndroidAutoPlay") {
      try {
        if (mediaId.startsWith(PREFIX_DOWNLOADED_SONG)) {
          playDownloaded(mediaId.removePrefix(PREFIX_DOWNLOADED_SONG))
          return@thread
        }

        val client = createClientFromPrefs() ?: return@thread
        when {
          mediaId.startsWith(PREFIX_SEARCH_SONG) -> playSearchSong(mediaId, client)
          mediaId.startsWith(PREFIX_ALBUM_SONG) -> playAlbumSong(mediaId, client)
          mediaId.startsWith(PREFIX_FAVORITE_SONG) -> playFavoriteSong(mediaId, client)
          mediaId.startsWith(PREFIX_GENRE_SONG) -> playGenreSong(mediaId, client)
          mediaId.startsWith(PREFIX_SONG) -> playQueue(listOf(client.getSong(mediaId.removePrefix(PREFIX_SONG)).let(::songFromJson)), 0, client)
          mediaId.startsWith(PREFIX_ALBUM) -> {
            val songs = client.getAlbum(mediaId.removePrefix(PREFIX_ALBUM)).optJSONArray("song").orEmptyObjects().map(::songFromJson)
            playQueue(songs, 0, client)
          }
          mediaId.startsWith(PREFIX_ARTIST) -> {
            val albums = client.getArtist(mediaId.removePrefix(PREFIX_ARTIST)).optJSONArray("album").orEmptyObjects()
            val firstAlbum = albums.firstOrNull() ?: return@thread
            val songs = client.getAlbum(firstAlbum.optString("id")).optJSONArray("song").orEmptyObjects().map(::songFromJson)
            playQueue(songs, 0, client)
          }
        }
      } catch (_: Exception) {
        handlePlaybackError()
      }
    }
  }

  private fun playSearchSong(mediaId: String, client: AutoSubsonicClient) {
    val parts = mediaId.removePrefix(PREFIX_SEARCH_SONG).split(MEDIA_ID_SEPARATOR, limit = 2)
    val songId = parts.getOrNull(0) ?: return
    val query = parts.getOrNull(1).orEmpty()
    val songs = client.search3(query).optJSONArray("song").orEmptyObjects().map(::songFromJson)
    val index = songs.indexOfFirst { it.id == songId }.takeIf { it >= 0 } ?: 0
    playQueue(songs, index, client)
  }

  private fun playAlbumSong(mediaId: String, client: AutoSubsonicClient) {
    val parts = mediaId.removePrefix(PREFIX_ALBUM_SONG).split(MEDIA_ID_SEPARATOR, limit = 2)
    val albumId = parts.getOrNull(0) ?: return
    val songId = parts.getOrNull(1) ?: return
    val songs = client.getAlbum(albumId).optJSONArray("song").orEmptyObjects().map(::songFromJson)
    val index = songs.indexOfFirst { it.id == songId }.takeIf { it >= 0 } ?: 0
    playQueue(songs, index, client)
  }

  private fun playGenreSong(mediaId: String, client: AutoSubsonicClient) {
    val parts = mediaId.removePrefix(PREFIX_GENRE_SONG).split(MEDIA_ID_SEPARATOR, limit = 2)
    val songId = parts.getOrNull(0) ?: return
    val genreName = parts.getOrNull(1).orEmpty()
    val songs = client.getSongsByGenre(genreName, 200).map(::songFromJson)
    val index = songs.indexOfFirst { it.id == songId }.takeIf { it >= 0 } ?: 0
    playQueue(songs, index, client)
  }

  private fun playFavoriteSong(mediaId: String, client: AutoSubsonicClient) {
    val songId = mediaId.removePrefix(PREFIX_FAVORITE_SONG)
    val songs = client.getStarred2().optJSONArray("song").orEmptyObjects().map(::songFromJson)
    val index = songs.indexOfFirst { it.id == songId }.takeIf { it >= 0 } ?: 0
    playQueue(songs, index, client)
  }

  private fun playFirstSearchResult(query: String) {
    thread(name = "ManaTunesAndroidAutoSearchPlay") {
      try {
        val client = createClientFromPrefs() ?: return@thread
        val songs = client.search3(query).optJSONArray("song").orEmptyObjects().map(::songFromJson)
        playQueue(songs, 0, client)
      } catch (_: Exception) {
        handlePlaybackError()
      }
    }
  }

  private fun playQueue(songs: List<AutoSong>, startIndex: Int, client: AutoSubsonicClient) {
    if (songs.isEmpty()) return
    queue = songs
    queueIndex = startIndex.coerceIn(songs.indices)
    restoredPositionMs = null
    saveQueueState(positionMs = 0L)
    playSong(queue[queueIndex], client)
  }

  private fun playDownloaded(songId: String) {
    val songs = downloadedAlbums().flatMap { it.songs }
    val index = songs.indexOfFirst { it.id == songId }
    if (index < 0) return
    playDownloadedQueue(songs, index)
  }

  private fun playDownloadedQueue(songs: List<AutoDownloadedSong>, startIndex: Int) {
    if (Looper.myLooper() != Looper.getMainLooper()) {
      mainHandler.post { playDownloadedQueue(songs, startIndex) }
      return
    }

    if (songs.isEmpty()) return
    if (!requestAudioFocus()) {
      handlePlaybackError()
      return
    }

    val index = startIndex.coerceIn(songs.indices)
    val song = songs[index]
    stopProgressUpdates()
    releaseCurrentPlayer()
    currentDurationMs = song.duration?.times(1000L)
    mediaSession.setMetadata(
      MediaMetadataCompat.Builder()
        .putString(MediaMetadataCompat.METADATA_KEY_MEDIA_ID, song.id)
        .putString(MediaMetadataCompat.METADATA_KEY_TITLE, song.title)
        .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, song.artist)
        .apply {
          if (song.duration != null) putLong(MediaMetadataCompat.METADATA_KEY_DURATION, song.duration * 1000L)
        }
        .build()
    )
    updatePlaybackState(PlaybackStateCompat.STATE_BUFFERING, 0L)

    mediaPlayer = MediaPlayer().apply {
      setAudioAttributes(
        AudioAttributes.Builder()
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .build()
      )
      setDataSource(song.localPath)
      setOnPreparedListener {
        it.start()
        updatePlaybackState(PlaybackStateCompat.STATE_PLAYING)
        startProgressUpdates()
      }
      setOnCompletionListener {
        stopProgressUpdates()
        if (index < songs.lastIndex) {
          playDownloadedQueue(songs, index + 1)
        } else {
          updatePlaybackState(PlaybackStateCompat.STATE_STOPPED)
        }
      }
      setOnErrorListener { _, _, _ ->
        handlePlaybackError()
        true
      }
      prepareAsync()
    }
  }

  private fun playSong(song: AutoSong, client: AutoSubsonicClient, seekToMs: Long = 0L) {
    if (Looper.myLooper() != Looper.getMainLooper()) {
      mainHandler.post { playSong(song, client, seekToMs) }
      return
    }

    if (!requestAudioFocus()) {
      handlePlaybackError()
      return
    }

    stopProgressUpdates()
    releaseCurrentPlayer()
    updateMetadata(song, client)
    currentDurationMs = song.duration?.times(1000L)
    updatePlaybackState(PlaybackStateCompat.STATE_BUFFERING, seekToMs.takeIf { it > 0L })

    mediaPlayer = MediaPlayer().apply {
      setAudioAttributes(
        AudioAttributes.Builder()
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .build()
      )
      setDataSource(client.streamUrl(song.id))
      setOnPreparedListener {
        if (seekToMs > 0L) it.seekTo(seekToMs.toInt())
        it.start()
        updatePlaybackState(PlaybackStateCompat.STATE_PLAYING)
        startProgressUpdates()
      }
      setOnCompletionListener {
        stopProgressUpdates()
        if (queueIndex < queue.lastIndex) {
          queueIndex += 1
          saveQueueState(positionMs = 0L)
          playSong(queue[queueIndex], client)
        } else {
          updatePlaybackState(PlaybackStateCompat.STATE_STOPPED)
        }
      }
      setOnErrorListener { _, _, _ ->
        handlePlaybackError()
        true
      }
      prepareAsync()
    }
  }

  private fun resume() {
    mainHandler.post {
      // Restored from a previous session — start streaming from the saved position
      if (mediaPlayer == null && queue.isNotEmpty() && queueIndex in queue.indices) {
        val client = createClientFromPrefs() ?: return@post
        val seekTo = restoredPositionMs ?: 0L
        restoredPositionMs = null
        playSong(queue[queueIndex], client, seekTo)
        return@post
      }
      if (requestAudioFocus()) {
        mediaPlayer?.start()
        updatePlaybackState(PlaybackStateCompat.STATE_PLAYING)
        startProgressUpdates()
      }
    }
  }

  private fun pause() {
    mainHandler.post {
      mediaPlayer?.pause()
      stopProgressUpdates()
      updatePlaybackState(PlaybackStateCompat.STATE_PAUSED)
      saveQueueState()
    }
  }

  private fun stop() {
    mainHandler.post {
      mediaPlayer?.stop()
      stopProgressUpdates()
      abandonAudioFocus()
      updatePlaybackState(PlaybackStateCompat.STATE_STOPPED)
      clearQueueState()
    }
  }

  private fun skipTo(index: Int) {
    val client = createClientFromPrefs() ?: return
    if (index !in queue.indices) return
    queueIndex = index
    saveQueueState(positionMs = 0L)
    playSong(queue[queueIndex], client)
  }

  private fun rewindOrPrevious() {
    mainHandler.post {
      val player = mediaPlayer
      if (player != null && player.currentPosition > 5_000) {
        player.seekTo(0)
        updatePlaybackState(playbackState)
        return@post
      }

      skipTo((queueIndex - 1).coerceAtLeast(0))
    }
  }

  private fun seekBy(deltaMs: Int) {
    mainHandler.post {
      val player = mediaPlayer ?: return@post
      val duration = player.duration.takeIf { it > 0 }
      val nextPosition = (player.currentPosition + deltaMs).let { position ->
        if (duration != null) position.coerceIn(0, duration) else position.coerceAtLeast(0)
      }
      player.seekTo(nextPosition)
      updatePlaybackState(playbackState)
    }
  }

  private fun seekTo(positionMs: Long) {
    mainHandler.post {
      val player = mediaPlayer ?: return@post
      val duration = player.duration.takeIf { it > 0 }
      val nextPosition = if (duration != null) {
        positionMs.coerceIn(0L, duration.toLong())
      } else {
        positionMs.coerceAtLeast(0L)
      }
      player.seekTo(nextPosition.toInt())
      updatePlaybackState(playbackState)
    }
  }

  private fun handlePlaybackError() {
    if (isPlaybackActive()) {
      updatePlaybackState(playbackState)
    } else {
      updatePlaybackState(PlaybackStateCompat.STATE_ERROR)
    }
  }

  private fun startProgressUpdates() {
    stopProgressUpdates()
    progressTickCount = 0
    mainHandler.postDelayed(progressRunnable, PROGRESS_UPDATE_INTERVAL_MS)
  }

  private fun stopProgressUpdates() {
    mainHandler.removeCallbacks(progressRunnable)
  }

  private fun releaseCurrentPlayer() {
    mediaPlayer?.release()
    mediaPlayer = null
  }

  private fun advanceAfterCompletion() {
    stopProgressUpdates()
    if (queueIndex < queue.lastIndex) {
      skipTo(queueIndex + 1)
    } else {
      clearQueueState()
      updatePlaybackState(PlaybackStateCompat.STATE_STOPPED)
    }
  }

  private fun saveQueueState(positionMs: Long = mediaPlayer?.safeCurrentPosition()?.toLong() ?: restoredPositionMs ?: 0L) {
    if (queue.isEmpty()) return
    val songsJson = JSONArray()
    queue.forEach { song ->
      songsJson.put(JSONObject().apply {
        put("id", song.id)
        put("title", song.title)
        song.artist?.let { put("artist", it) }
        song.album?.let { put("album", it) }
        song.coverArt?.let { put("coverArt", it) }
        song.duration?.let { put("duration", it) }
      })
    }
    val state = JSONObject().apply {
      put("index", queueIndex)
      put("positionMs", positionMs)
      put("songs", songsJson)
    }
    getSharedPreferences(AndroidAutoConfigModule.PREFS_NAME, 0)
      .edit().putString(KEY_QUEUE_STATE, state.toString()).apply()
  }

  private fun clearQueueState() {
    getSharedPreferences(AndroidAutoConfigModule.PREFS_NAME, 0)
      .edit().remove(KEY_QUEUE_STATE).apply()
  }

  private fun restoreQueueState() {
    val json = getSharedPreferences(AndroidAutoConfigModule.PREFS_NAME, 0)
      .getString(KEY_QUEUE_STATE, null) ?: return
    try {
      val obj = JSONObject(json)
      val songsJson = obj.optJSONArray("songs").orEmptyObjects()
      if (songsJson.isEmpty()) return
      val songs = songsJson.map { songJson ->
        AutoSong(
          id = songJson.optString("id"),
          title = songJson.optString("title", "Unknown Track"),
          artist = songJson.optString("artist").takeIf { it.isNotBlank() },
          album = songJson.optString("album").takeIf { it.isNotBlank() },
          coverArt = songJson.optString("coverArt").takeIf { it.isNotBlank() },
          duration = songJson.optInt("duration").takeIf { songJson.has("duration") }
        )
      }
      val index = obj.optInt("index", 0).coerceIn(songs.indices)
      val positionMs = obj.optLong("positionMs", 0L)

      queue = songs
      queueIndex = index
      restoredPositionMs = positionMs
      currentDurationMs = songs[index].duration?.times(1000L)

      val song = songs[index]
      val client = createClientFromPrefs()
      if (client != null) {
        updateMetadata(song, client)
      } else {
        mediaSession.setMetadata(
          MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_MEDIA_ID, song.id)
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, song.title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, song.artist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, song.album)
            .apply {
              if (song.duration != null) putLong(MediaMetadataCompat.METADATA_KEY_DURATION, song.duration * 1000L)
            }
            .build()
        )
      }
      updatePlaybackState(PlaybackStateCompat.STATE_PAUSED, positionMs)
    } catch (_: Exception) {
      // Corrupted saved state — ignore and start fresh
    }
  }

  private fun requestAudioFocus(): Boolean {
    val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .build()
      )
      .setOnAudioFocusChangeListener { focusChange ->
        if (focusChange == AudioManager.AUDIOFOCUS_LOSS) {
          mainHandler.post {
            mediaPlayer?.pause()
            updatePlaybackState(PlaybackStateCompat.STATE_PAUSED)
          }
        }
      }
      .build()
    audioFocusRequest = request
    return audioManager.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
  }

  private fun abandonAudioFocus() {
    audioFocusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
    audioFocusRequest = null
  }

  private fun updateMetadata(song: AutoSong, client: AutoSubsonicClient) {
    val art = song.coverArt?.let { client.coverArtUrl(it) }
    mediaSession.setMetadata(
      MediaMetadataCompat.Builder()
        .putString(MediaMetadataCompat.METADATA_KEY_MEDIA_ID, song.id)
        .putString(MediaMetadataCompat.METADATA_KEY_TITLE, song.title)
        .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, song.artist)
        .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, song.album)
        .apply {
          if (song.duration != null) putLong(MediaMetadataCompat.METADATA_KEY_DURATION, song.duration * 1000L)
          if (art != null) putString(MediaMetadataCompat.METADATA_KEY_ALBUM_ART_URI, art)
        }
        .build()
    )
  }

  private fun updatePlaybackState(state: Int, positionOverride: Long? = null) {
    playbackState = state
    val position = positionOverride ?: mediaPlayer?.currentPosition?.toLong() ?: PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN
    mediaSession.setPlaybackState(
      PlaybackStateCompat.Builder()
        .setActions(
          PlaybackStateCompat.ACTION_PLAY or
            PlaybackStateCompat.ACTION_PAUSE or
            PlaybackStateCompat.ACTION_STOP or
            PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
            PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
            PlaybackStateCompat.ACTION_FAST_FORWARD or
            PlaybackStateCompat.ACTION_REWIND or
            PlaybackStateCompat.ACTION_SEEK_TO or
            PlaybackStateCompat.ACTION_PLAY_FROM_MEDIA_ID or
            PlaybackStateCompat.ACTION_PLAY_FROM_SEARCH
        )
        .setState(state, position, if (state == PlaybackStateCompat.STATE_PLAYING) 1f else 0f)
        .build()
    )
  }

  private fun isPlaybackActive() =
    playbackState == PlaybackStateCompat.STATE_PLAYING ||
      playbackState == PlaybackStateCompat.STATE_BUFFERING ||
      playbackState == PlaybackStateCompat.STATE_PAUSED

  private fun MediaPlayer.safeCurrentPosition() =
    try {
      currentPosition
    } catch (_: IllegalStateException) {
      0
    }

  private fun MediaPlayer.safeDuration() =
    try {
      duration.takeIf { it > 0 }?.toLong()
    } catch (_: IllegalStateException) {
      null
    }

  private fun browseItem(id: String, title: String, subtitle: String) =
    MediaBrowserCompat.MediaItem(
      MediaDescriptionCompat.Builder().setMediaId(id).setTitle(title).setSubtitle(subtitle).build(),
      MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
    )

  private fun rootItems() = mutableListOf(
    browseItem(MEDIA_ID_ARTISTS, "Artists", "Browse all artists"),
    browseItem(MEDIA_ID_ALBUMS, "Albums", "Browse albums"),
    browseItem(MEDIA_ID_GENRES, "Genres", "Browse by genre"),
    browseItem(MEDIA_ID_FAVORITES, "Favorites", "Browse starred music"),
    browseItem(MEDIA_ID_DOWNLOADED, "Downloaded", "Browse downloaded music")
  )

  private fun genreFromJson(json: JSONObject) = AutoGenre(
    name = json.optString("value", "Unknown Genre"),
    songCount = json.optInt("songCount", 0)
  )

  private fun genreItem(genre: AutoGenre) =
    browseItem("${PREFIX_GENRE}${genre.name}", genre.name, "${genre.songCount} songs")

  private fun artistItem(artist: AutoArtist) =
    browseItem("${PREFIX_ARTIST}${artist.id}", artist.name, "${artist.albumCount ?: 0} albums")

  private fun albumItem(album: AutoAlbum, mediaId: String) =
    MediaBrowserCompat.MediaItem(
      MediaDescriptionCompat.Builder()
        .setMediaId(mediaId)
        .setTitle(album.name)
        .setSubtitle(album.artist ?: "Album")
        .build(),
      MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
    )

  private fun songItem(song: AutoSong, mediaId: String = "${PREFIX_SONG}${song.id}") =
    MediaBrowserCompat.MediaItem(
      MediaDescriptionCompat.Builder()
        .setMediaId(mediaId)
        .setTitle(song.title)
        .setSubtitle(song.artist ?: song.album ?: "Song")
        .build(),
      MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
    )

  private fun noServerItems() = mutableListOf(
    errorItem("No server configured", "Open ManaTunes on your phone and add a server")
  )

  private fun downloadedItems(): MutableList<MediaBrowserCompat.MediaItem> {
    val albums = downloadedAlbums()
    if (albums.isEmpty()) {
      return mutableListOf(errorItem("No downloaded albums", "Download albums on your phone first"))
    }

    return albums.map { album ->
      MediaBrowserCompat.MediaItem(
        MediaDescriptionCompat.Builder()
          .setMediaId("${PREFIX_DOWNLOADED_ALBUM}${album.id}")
          .setTitle(album.name)
          .setSubtitle(album.artist ?: "Downloaded album")
          .build(),
        MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
      )
    }.toMutableList()
  }

  private fun downloadedSongItem(song: AutoDownloadedSong) =
    MediaBrowserCompat.MediaItem(
      MediaDescriptionCompat.Builder()
        .setMediaId("${PREFIX_DOWNLOADED_SONG}${song.id}")
        .setTitle(song.title)
        .setSubtitle(song.artist ?: "Downloaded song")
        .build(),
      MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
    )

  private fun downloadedAlbums(): List<AutoDownloadedAlbum> {
    val json = getSharedPreferences(AndroidAutoConfigModule.PREFS_NAME, 0)
      .getString(AndroidAutoConfigModule.KEY_DOWNLOADED_ALBUMS, null)
      ?: return emptyList()

    return try {
      val array = JSONArray(json)
      array.orEmptyObjects().map { album ->
        AutoDownloadedAlbum(
          id = album.optString("id"),
          name = album.optString("name", "Downloaded Album"),
          artist = album.optString("artist").takeIf { it.isNotBlank() },
          songs = album.optJSONArray("songs").orEmptyObjects().map { song ->
            AutoDownloadedSong(
              id = song.optString("id"),
              title = song.optString("title", "Unknown Track"),
              artist = song.optString("artist").takeIf { it.isNotBlank() },
              duration = song.optInt("duration").takeIf { song.has("duration") },
              localPath = song.optString("localPath")
            )
          }.filter { it.localPath.isNotBlank() }
        )
      }
    } catch (_: Exception) {
      emptyList()
    }
  }

  private fun errorItem(title: String, subtitle: String) =
    MediaBrowserCompat.MediaItem(
      MediaDescriptionCompat.Builder().setMediaId("message_$title").setTitle(title).setSubtitle(subtitle).build(),
      MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
    )

  private fun JSONArray?.orEmptyObjects(): List<JSONObject> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { optJSONObject(it) }
  }

  private fun artistFromJson(json: JSONObject) = AutoArtist(
    id = json.optString("id"),
    name = json.optString("name", "Unknown Artist"),
    albumCount = json.optInt("albumCount").takeIf { json.has("albumCount") }
  )

  private fun albumFromJson(json: JSONObject) = AutoAlbum(
    id = json.optString("id"),
    name = json.optString("name", "Unknown Album"),
    artist = json.optString("artist").takeIf { it.isNotBlank() }
  )

  private fun songFromJson(json: JSONObject) = AutoSong(
    id = json.optString("id"),
    title = json.optString("title", "Unknown Track"),
    artist = json.optString("artist").takeIf { it.isNotBlank() },
    album = json.optString("album").takeIf { it.isNotBlank() },
    coverArt = json.optString("coverArt").takeIf { it.isNotBlank() },
    duration = json.optInt("duration").takeIf { json.has("duration") }
  )

  private data class AutoArtist(val id: String, val name: String, val albumCount: Int?)
  private data class AutoAlbum(val id: String, val name: String, val artist: String?)
  private data class AutoSong(
    val id: String,
    val title: String,
    val artist: String?,
    val album: String?,
    val coverArt: String?,
    val duration: Int?
  )
  private data class AutoGenre(val name: String, val songCount: Int)
  private data class AutoDownloadedAlbum(
    val id: String,
    val name: String,
    val artist: String?,
    val songs: List<AutoDownloadedSong>
  )
  private data class AutoDownloadedSong(
    val id: String,
    val title: String,
    val artist: String?,
    val duration: Int?,
    val localPath: String
  )

  private inner class AutoSubsonicClient(
    private val serverUrl: String,
    private val username: String,
    private val password: String
  ) {
    fun getArtists(): List<JSONObject> =
      get("/getArtists").optJSONObject("artists")
        ?.optJSONArray("index")
        .orEmptyObjects()
        .flatMap { it.optJSONArray("artist").orEmptyObjects() }

    fun getArtist(id: String): JSONObject = get("/getArtist", "id" to id).optJSONObject("artist") ?: JSONObject()
    fun getAlbum(id: String): JSONObject = get("/getAlbum", "id" to id).optJSONObject("album") ?: JSONObject()
    fun getSong(id: String): JSONObject = get("/getSong", "id" to id).optJSONObject("song") ?: JSONObject()
    fun getStarred2(): JSONObject = get("/getStarred2").optJSONObject("starred2") ?: JSONObject()

    fun getAlbumList2(type: String, size: Int): List<JSONObject> =
      get("/getAlbumList2", "type" to type, "size" to size.toString())
        .optJSONObject("albumList2")
        ?.optJSONArray("album")
        .orEmptyObjects()

    fun getGenres(): List<JSONObject> =
      get("/getGenres").optJSONObject("genres")
        ?.optJSONArray("genre")
        .orEmptyObjects()

    fun getSongsByGenre(genre: String, count: Int): List<JSONObject> =
      get("/getSongsByGenre", "genre" to genre, "count" to count.toString())
        .optJSONObject("songsByGenre")
        ?.optJSONArray("song")
        .orEmptyObjects()

    fun search3(query: String): JSONObject =
      get("/search3", "query" to query, "artistCount" to "10", "albumCount" to "10", "songCount" to "25")
        .optJSONObject("searchResult3") ?: JSONObject()

    fun streamUrl(id: String): String {
      val replayGain = getSharedPreferences(AndroidAutoConfigModule.PREFS_NAME, 0)
        .getString(AndroidAutoConfigModule.KEY_REPLAY_GAIN, "off")
      return if (replayGain != null && replayGain != "off") {
        val apiValue = if (replayGain == "track") "trackGain" else "albumGain"
        url("/stream", "id" to id, "replayGain" to apiValue)
      } else {
        url("/stream", "id" to id)
      }
    }
    fun coverArtUrl(id: String): String = url("/getCoverArt", "id" to id)

    private fun get(endpoint: String, vararg params: Pair<String, String>): JSONObject {
      val connection = URL(url(endpoint, *params)).openConnection() as HttpURLConnection
      connection.connectTimeout = 30_000
      connection.readTimeout = 30_000
      connection.requestMethod = "GET"
      val text = connection.inputStream.bufferedReader().use { it.readText() }
      val body = JSONObject(text).getJSONObject("subsonic-response")
      if (body.optString("status") != "ok") {
        val error = body.optJSONObject("error")
        throw IllegalStateException(error?.optString("message") ?: "Subsonic request failed")
      }
      return body
    }

    private fun url(endpoint: String, vararg params: Pair<String, String>): String {
      val allParams = authParams() + params.toMap()
      val query = allParams.entries.joinToString("&") { (key, value) ->
        "${encode(key)}=${encode(value)}"
      }
      return "${serverUrl.trimEnd('/')}/rest$endpoint?$query"
    }

    private fun authParams(): Map<String, String> {
      val salt = "aa" + System.currentTimeMillis().toString(36)
      return mapOf(
        "u" to username,
        "t" to md5(password + salt),
        "s" to salt,
        "v" to "1.16.1",
        "c" to "ManaTunesAndroidAuto",
        "f" to "json"
      )
    }

    private fun encode(value: String) = URLEncoder.encode(value, "UTF-8")

    private fun md5(value: String): String =
      MessageDigest.getInstance("MD5").digest(value.toByteArray())
        .joinToString("") { "%02x".format(it) }

  }

  private fun createClientFromPrefs(): AutoSubsonicClient? {
    val prefs = getSharedPreferences(AndroidAutoConfigModule.PREFS_NAME, 0)
    val url = prefs.getString(AndroidAutoConfigModule.KEY_URL, null)
    val username = prefs.getString(AndroidAutoConfigModule.KEY_USERNAME, null)
    val password = prefs.getString(AndroidAutoConfigModule.KEY_PASSWORD, null)
    if (url.isNullOrBlank() || username.isNullOrBlank() || password.isNullOrBlank()) return null
    return AutoSubsonicClient(url, username, password)
  }

  private companion object {
    const val ROOT_ID = "manatunes_root"
    const val MEDIA_ID_ARTISTS = "artists"
    const val MEDIA_ID_ALBUMS = "albums"
    const val MEDIA_ID_FAVORITES = "favorites"
    const val MEDIA_ID_FAVORITE_ARTISTS = "favorite_artists"
    const val MEDIA_ID_FAVORITE_ALBUMS = "favorite_albums"
    const val MEDIA_ID_FAVORITE_SONGS = "favorite_songs"
    const val MEDIA_ID_DOWNLOADED = "downloaded"
    const val MEDIA_ID_GENRES = "genres"
    const val PREFIX_ARTIST = "artist:"
    const val PREFIX_ALBUM = "album:"
    const val PREFIX_SONG = "song:"
    const val PREFIX_ALBUM_SONG = "album_song:"
    const val PREFIX_SEARCH_SONG = "search_song:"
    const val PREFIX_FAVORITE_SONG = "favorite_song:"
    const val PREFIX_DOWNLOADED_ALBUM = "downloaded_album:"
    const val PREFIX_DOWNLOADED_SONG = "downloaded_song:"
    const val PREFIX_GENRE = "genre:"
    const val PREFIX_GENRE_SONG = "genre_song:"
    const val MEDIA_ID_SEPARATOR = "||"
    const val KEY_QUEUE_STATE = "queue_state"
    const val COMPLETION_ADVANCE_EARLY_MS = 500L
    const val PROGRESS_UPDATE_INTERVAL_MS = 500L
    const val QUEUE_SAVE_INTERVAL_TICKS = 60 // save every ~30 s (60 × 500 ms)
  }
}
