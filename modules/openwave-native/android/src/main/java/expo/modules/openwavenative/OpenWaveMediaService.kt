package expo.modules.openwavenative

import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import java.io.ByteArrayOutputStream
import androidx.core.content.ContextCompat
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaController
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaSession
import androidx.media3.session.SessionToken
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import org.json.JSONArray
import java.lang.ref.WeakReference

/**
 * Foreground AndroidX Media3 MediaLibraryService providing:
 * - Background ExoPlayer playback with lock-screen & notification controls
 * - Hardware/PCM DSP pipeline (Equalizer, BassBoost, Virtualizer, LoudnessEnhancer, Stereo Balance)
 * - Android Auto browsable media tree + Google Assistant search support
 * - Remote Next/Prev forwarding synchronized with OpenWave's QueueManager
 */
@UnstableApi
class OpenWaveMediaService : MediaLibraryService() {

  private val mainHandler = Handler(Looper.getMainLooper())
  val balanceProcessor = ChannelBalanceAudioProcessor()
  val dspController = OpenWaveDspController(balanceProcessor)

  lateinit var exoPlayer: ExoPlayer
    private set
  private var mediaLibrarySession: MediaLibrarySession? = null

  private var pendingConfig: DspConfigPayload? = null
  private var currentTrackMeta: Map<String, String?> = emptyMap()
  private var lastEmittedFinishUri: String? = null

  private val progressTicker = object : Runnable {
    override fun run() {
      if (::exoPlayer.isInitialized && exoPlayer.isPlaying) {
        emitCurrentPlaybackStatus(didJustFinish = false)
        mainHandler.postDelayed(this, 250L)
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    currentInstanceRef = WeakReference(this)

    val renderersFactory = object : DefaultRenderersFactory(this) {
      override fun buildAudioSink(
        context: Context,
        enableFloatOutput: Boolean,
        enableAudioTrackPlaybackParams: Boolean
      ): AudioSink {
        return DefaultAudioSink.Builder(context)
          .setAudioProcessors(arrayOf(balanceProcessor))
          .setEnableFloatOutput(enableFloatOutput)
          .setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams)
          .build()
      }
    }

    val audioAttributes = AudioAttributes.Builder()
      .setUsage(C.USAGE_MEDIA)
      .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
      .build()

    exoPlayer = ExoPlayer.Builder(this, renderersFactory)
      .setAudioAttributes(audioAttributes, true)
      .setHandleAudioBecomingNoisy(true)
      .setWakeMode(C.WAKE_MODE_NETWORK)
      .build()

    exoPlayer.addListener(object : Player.Listener {
      override fun onAudioSessionIdChanged(audioSessionId: Int) {
        dspController.attachToAudioSession(audioSessionId)
        pendingConfig?.let { dspController.applyConfig(it) }
      }

      override fun onIsPlayingChanged(isPlaying: Boolean) {
        mainHandler.removeCallbacks(progressTicker)
        if (isPlaying) {
          mainHandler.postDelayed(progressTicker, 250L)
        }
        emitCurrentPlaybackStatus(didJustFinish = false)
        syncWidgetWithCurrentTrack()
      }

      override fun onPlaybackStateChanged(playbackState: Int) {
        val finished = playbackState == Player.STATE_ENDED
        if (finished) {
          val uri = exoPlayer.currentMediaItem?.mediaId
          if (uri != lastEmittedFinishUri) {
            lastEmittedFinishUri = uri
            emitCurrentPlaybackStatus(didJustFinish = true)
          }
        } else {
          emitCurrentPlaybackStatus(didJustFinish = false)
        }
      }

      override fun onPlayerError(error: PlaybackException) {
        OpenWaveNativeModule.emitPlaybackStatus(
          mapOf(
            "isLoaded" to false,
            "isPlaying" to false,
            "positionMillis" to 0L,
            "durationMillis" to 0L,
            "didJustFinish" to false,
            "isBuffering" to false,
            "error" to (error.localizedMessage ?: "Error de reproducción nativa Media3")
          )
        )
      }
    })

    // Wrap ExoPlayer so Notification Shade / Lock Screen / Bluetooth expose full Scrubbing SeekBar + Next/Prev
    val forwardingPlayer = object : ForwardingPlayer(exoPlayer) {
      override fun getAvailableCommands(): Player.Commands {
        return super.getAvailableCommands().buildUpon()
          .addAll(
            Player.COMMAND_PLAY_PAUSE,
            Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM,
            Player.COMMAND_SEEK_BACK,
            Player.COMMAND_SEEK_FORWARD,
            Player.COMMAND_SEEK_TO_NEXT,
            Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM,
            Player.COMMAND_SEEK_TO_PREVIOUS,
            Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM
          )
          .build()
      }

      override fun isCommandAvailable(command: Int): Boolean {
        return when (command) {
          Player.COMMAND_PLAY_PAUSE,
          Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM,
          Player.COMMAND_SEEK_BACK,
          Player.COMMAND_SEEK_FORWARD,
          Player.COMMAND_SEEK_TO_NEXT,
          Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM,
          Player.COMMAND_SEEK_TO_PREVIOUS,
          Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM -> true
          else -> super.isCommandAvailable(command)
        }
      }

      override fun seekTo(positionMs: Long) {
        super.seekTo(positionMs.coerceAtLeast(0L))
        emitCurrentPlaybackStatus(didJustFinish = false)
      }

      override fun seekTo(mediaItemIndex: Int, positionMs: Long) {
        super.seekTo(mediaItemIndex, positionMs.coerceAtLeast(0L))
        emitCurrentPlaybackStatus(didJustFinish = false)
      }

      override fun seekToNext() {
        if (exoPlayer.mediaItemCount > 1) {
          super.seekToNext()
        } else {
          OpenWaveNativeModule.emitRemoteCommand("next")
        }
      }

      override fun seekToNextMediaItem() {
        seekToNext()
      }

      override fun seekToPrevious() {
        if (exoPlayer.mediaItemCount > 1) {
          super.seekToPrevious()
        } else {
          OpenWaveNativeModule.emitRemoteCommand("prev")
        }
      }

      override fun seekToPreviousMediaItem() {
        seekToPrevious()
      }
    }

    val notificationProvider = DefaultMediaNotificationProvider.Builder(this).build().apply {
      setSmallIcon(R.drawable.ic_openwave_notif)
    }
    setMediaNotificationProvider(notificationProvider)

    val sessionBuilder = MediaLibrarySession.Builder(this, forwardingPlayer, LibraryCallback())
    packageManager.getLaunchIntentForPackage(packageName)?.let { launchIntent ->
      val openAppIntent = PendingIntent.getActivity(
        this,
        200,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      sessionBuilder.setSessionActivity(openAppIntent)
    }

    mediaLibrarySession = sessionBuilder.build()

    if (exoPlayer.audioSessionId != C.AUDIO_SESSION_ID_UNSET) {
      dspController.attachToAudioSession(exoPlayer.audioSessionId)
    }

    flushPendingBindings(this)
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession? {
    return mediaLibrarySession
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    if (::exoPlayer.isInitialized && (!exoPlayer.playWhenReady || exoPlayer.mediaItemCount == 0)) {
      stopSelf()
    }
  }

  override fun onDestroy() {
    mainHandler.removeCallbacks(progressTicker)
    dspController.releaseEffects()
    mediaLibrarySession?.release()
    mediaLibrarySession = null
    if (::exoPlayer.isInitialized) {
      exoPlayer.release()
    }
    currentInstanceRef = null
    super.onDestroy()
  }

  fun loadTrack(
    uri: String,
    shouldPlay: Boolean,
    title: String?,
    artist: String?,
    album: String?,
    artworkUri: String?
  ) {
    lastEmittedFinishUri = null
    currentTrackMeta = mapOf(
      "title" to title,
      "artist" to artist,
      "album" to album,
      "artworkUri" to artworkUri
    )

    val item = buildMediaItem(uri, uri, title, artist, album, artworkUri)
    exoPlayer.setMediaItem(item)
    exoPlayer.prepare()
    exoPlayer.playWhenReady = shouldPlay
    if (exoPlayer.audioSessionId != C.AUDIO_SESSION_ID_UNSET) {
      dspController.attachToAudioSession(exoPlayer.audioSessionId)
    }
    syncWidgetWithCurrentTrack()
    emitCurrentPlaybackStatus(didJustFinish = false)
  }

  fun updateCurrentMetadata(
    title: String?,
    artist: String?,
    album: String?,
    artworkUri: String?
  ) {
    currentTrackMeta = mapOf(
      "title" to title,
      "artist" to artist,
      "album" to album,
      "artworkUri" to artworkUri
    )
    val current = exoPlayer.currentMediaItem ?: return
    val updated = current.buildUpon()
      .setMediaMetadata(buildMediaMetadata(title, artist, album, artworkUri))
      .build()
    exoPlayer.replaceMediaItem(exoPlayer.currentMediaItemIndex, updated)
    syncWidgetWithCurrentTrack()
  }

  fun play() {
    if (!exoPlayer.isPlaying) {
      exoPlayer.play()
    }
  }

  fun pause() {
    if (exoPlayer.isPlaying) {
      exoPlayer.pause()
    }
  }

  fun stopPlayback() {
    exoPlayer.stop()
    exoPlayer.clearMediaItems()
    emitCurrentPlaybackStatus(didJustFinish = false)
  }

  fun seekTo(positionMs: Long) {
    exoPlayer.seekTo(positionMs.coerceAtLeast(0L))
    emitCurrentPlaybackStatus(didJustFinish = false)
  }

  fun setVolume(volume: Float) {
    exoPlayer.volume = volume.coerceIn(0f, 1f)
  }

  fun setPlaybackSpeed(speed: Float) {
    exoPlayer.playbackParameters = PlaybackParameters(speed.coerceIn(0.25f, 3.0f))
  }

  fun applyDspConfig(config: DspConfigPayload): Map<String, Any?> {
    pendingConfig = config
    if (exoPlayer.audioSessionId != C.AUDIO_SESSION_ID_UNSET) {
      dspController.attachToAudioSession(exoPlayer.audioSessionId)
    }
    return dspController.applyConfig(config)
  }

  fun handleDirectWidgetAction(action: String) {
    mainHandler.post {
      if (!::exoPlayer.isInitialized) return@post
      when (action) {
        "play_pause" -> {
          if (exoPlayer.isPlaying) exoPlayer.pause() else exoPlayer.play()
        }
      }
    }
  }

  private fun syncWidgetWithCurrentTrack() {
    val title = currentTrackMeta["title"]
      ?: exoPlayer.currentMediaItem?.mediaMetadata?.title?.toString()
      ?: "OPENWAVE"
    val artist = currentTrackMeta["artist"]
      ?: exoPlayer.currentMediaItem?.mediaMetadata?.artist?.toString()
      ?: "Reproduciendo en segundo plano"
    val artwork = currentTrackMeta["artworkUri"]
      ?: exoPlayer.currentMediaItem?.mediaMetadata?.artworkUri?.toString()
    OpenWaveWidgetProvider.saveAndRefreshAll(
      this,
      title,
      artist,
      artwork,
      exoPlayer.isPlaying
    )
  }

  private fun emitCurrentPlaybackStatus(didJustFinish: Boolean) {
    if (!::exoPlayer.isInitialized) return
    val duration = exoPlayer.duration.let { if (it == C.TIME_UNSET || it < 0L) 0L else it }
    val position = exoPlayer.currentPosition.coerceAtLeast(0L)
    val state = exoPlayer.playbackState
    OpenWaveNativeModule.emitPlaybackStatus(
      mapOf(
        "isLoaded" to (exoPlayer.currentMediaItem != null && state != Player.STATE_IDLE),
        "isPlaying" to exoPlayer.isPlaying,
        "positionMillis" to position,
        "durationMillis" to duration,
        "didJustFinish" to didJustFinish,
        "isBuffering" to (state == Player.STATE_BUFFERING),
        "audioSessionId" to exoPlayer.audioSessionId
      )
    )
  }

  // ---- Android Auto Catalog & MediaLibrarySession Callback ----

  private data class AutoTrackEntry(
    val id: String,
    val title: String,
    val artist: String,
    val album: String,
    val uri: String,
    val artworkUri: String?,
    val isFavorite: Boolean
  )

  private fun loadAutoCatalog(): List<AutoTrackEntry> {
    val raw = getSharedPreferences(AUTO_PREFS_NAME, MODE_PRIVATE)
      .getString(KEY_AUTO_CATALOG, null) ?: return emptyList()
    return runCatching {
      val arr = JSONArray(raw)
      buildList {
        for (i in 0 until arr.length()) {
          val obj = arr.optJSONObject(i) ?: continue
          val uri = obj.optString("uri", "")
          if (uri.isBlank()) continue
          add(
            AutoTrackEntry(
              id = obj.optString("id", uri),
              title = obj.optString("title", "Sin título"),
              artist = obj.optString("artistName", "Artista desconocido"),
              album = obj.optString("albumTitle", "Álbum desconocido"),
              uri = uri,
              artworkUri = obj.optString("artworkUri", "").takeIf { it.isNotBlank() },
              isFavorite = obj.optBoolean("isFavorite", false)
            )
          )
        }
      }
    }.getOrDefault(emptyList())
  }

  private fun AutoTrackEntry.toMediaItem(): MediaItem {
    return buildMediaItem(
      mediaId = "track:$id",
      uri = uri,
      title = title,
      artist = artist,
      album = album,
      artworkUri = artworkUri
    )
  }

  private fun buildBrowsableNode(id: String, title: String, subtitle: String? = null): MediaItem {
    val meta = MediaMetadata.Builder()
      .setTitle(title)
      .setSubtitle(subtitle)
      .setIsBrowsable(true)
      .setIsPlayable(false)
      .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
      .build()
    return MediaItem.Builder()
      .setMediaId(id)
      .setMediaMetadata(meta)
      .build()
  }

  private inner class LibraryCallback : MediaLibrarySession.Callback {

    override fun onGetLibraryRoot(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      params: LibraryParams?
    ): ListenableFuture<LibraryResult<MediaItem>> {
      return Futures.immediateFuture(
        LibraryResult.ofItem(buildBrowsableNode(ROOT_ID, "OpenWave"), params)
      )
    }

    override fun onGetChildren(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      parentId: String,
      page: Int,
      pageSize: Int,
      params: LibraryParams?
    ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
      val catalog = loadAutoCatalog()
      val children: List<MediaItem> = when {
        parentId == ROOT_ID -> listOf(
          buildBrowsableNode(NODE_SONGS, "Canciones", "${catalog.size} pistas"),
          buildBrowsableNode(NODE_FAVORITES, "Favoritas", "${catalog.count { it.isFavorite }} pistas"),
          buildBrowsableNode(NODE_ALBUMS, "Álbumes")
        )
        parentId == NODE_SONGS -> catalog.map { it.toMediaItem() }
        parentId == NODE_FAVORITES -> catalog.filter { it.isFavorite }.map { it.toMediaItem() }
        parentId == NODE_ALBUMS -> catalog
          .groupBy { it.album }
          .keys
          .sorted()
          .map { albumName -> buildBrowsableNode("$PREFIX_ALBUM$albumName", albumName) }
        parentId.startsWith(PREFIX_ALBUM) -> {
          val albumName = parentId.removePrefix(PREFIX_ALBUM)
          catalog.filter { it.album == albumName }.map { it.toMediaItem() }
        }
        else -> emptyList()
      }

      val paged = if (pageSize > 0) {
        val from = (page * pageSize).coerceAtLeast(0)
        val to = ((page + 1) * pageSize).coerceAtMost(children.size)
        if (from < to) children.subList(from, to) else emptyList()
      } else {
        children
      }

      return Futures.immediateFuture(
        LibraryResult.ofItemList(ImmutableList.copyOf(paged), params)
      )
    }

    override fun onGetItem(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      mediaId: String
    ): ListenableFuture<LibraryResult<MediaItem>> {
      val entry = loadAutoCatalog().find { "track:${it.id}" == mediaId || it.id == mediaId }
      return if (entry != null) {
        Futures.immediateFuture(LibraryResult.ofItem(entry.toMediaItem(), null))
      } else {
        Futures.immediateFuture(LibraryResult.ofError(LibraryResult.RESULT_ERROR_BAD_VALUE))
      }
    }

    override fun onAddMediaItems(
      mediaSession: MediaSession,
      controller: MediaSession.ControllerInfo,
      mediaItems: MutableList<MediaItem>
    ): ListenableFuture<MutableList<MediaItem>> {
      val catalogById = loadAutoCatalog().associateBy { "track:${it.id}" }
      val resolved = mediaItems.mapNotNull { item ->
        catalogById[item.mediaId]?.toMediaItem()
          ?: item.takeIf { it.localConfiguration != null }
      }.toMutableList()
      return Futures.immediateFuture(resolved)
    }

    override fun onSearch(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      query: String,
      params: LibraryParams?
    ): ListenableFuture<LibraryResult<Void>> {
      val count = searchCatalog(query).size
      session.notifySearchResultChanged(browser, query, count, params)
      return Futures.immediateFuture(LibraryResult.ofVoid(params))
    }

    override fun onGetSearchResult(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      query: String,
      page: Int,
      pageSize: Int,
      params: LibraryParams?
    ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
      val matches = searchCatalog(query).map { it.toMediaItem() }
      return Futures.immediateFuture(LibraryResult.ofItemList(ImmutableList.copyOf(matches), params))
    }

    private fun searchCatalog(query: String): List<AutoTrackEntry> {
      val q = query.trim().lowercase()
      if (q.isBlank()) return emptyList()
      return loadAutoCatalog().filter {
        it.title.lowercase().contains(q) ||
          it.artist.lowercase().contains(q) ||
          it.album.lowercase().contains(q)
      }
    }
  }

  companion object {
    private const val ROOT_ID = "openwave_root"
    private const val NODE_SONGS = "openwave_songs"
    private const val NODE_FAVORITES = "openwave_favorites"
    private const val NODE_ALBUMS = "openwave_albums"
    private const val PREFIX_ALBUM = "openwave_album:"

    const val AUTO_PREFS_NAME = "openwave_auto_catalog"
    const val KEY_AUTO_CATALOG = "catalog_json"

    @Volatile
    private var currentInstanceRef: WeakReference<OpenWaveMediaService>? = null

    val currentInstance: OpenWaveMediaService?
      get() = currentInstanceRef?.get()

    private val pendingTasks = mutableListOf<(OpenWaveMediaService) -> Unit>()
    private var controllerFutureStarted = false

    fun withService(context: Context, action: (OpenWaveMediaService) -> Unit) {
      val existing = currentInstance
      if (existing != null) {
        Handler(Looper.getMainLooper()).post { action(existing) }
        return
      }
      synchronized(pendingTasks) {
        pendingTasks.add(action)
      }
      ensureServiceBound(context.applicationContext)
    }

    private fun ensureServiceBound(appContext: Context) {
      if (controllerFutureStarted) return
      controllerFutureStarted = true
      Handler(Looper.getMainLooper()).post {
        runCatching {
          val token = SessionToken(
            appContext,
            ComponentName(appContext, OpenWaveMediaService::class.java)
          )
          val future = MediaController.Builder(appContext, token).buildAsync()
          future.addListener({
            runCatching { future.get() }
            controllerFutureStarted = false
          }, ContextCompat.getMainExecutor(appContext))
        }.onFailure {
          controllerFutureStarted = false
        }
      }
    }

    private fun flushPendingBindings(service: OpenWaveMediaService) {
      val actions: List<(OpenWaveMediaService) -> Unit>
      synchronized(pendingTasks) {
        actions = pendingTasks.toList()
        pendingTasks.clear()
      }
      Handler(Looper.getMainLooper()).post {
        for (act in actions) {
          act(service)
        }
      }
    }

    fun buildMediaMetadata(
      title: String?,
      artist: String?,
      album: String?,
      artworkUri: String?
    ): MediaMetadata {
      val builder = MediaMetadata.Builder()
        .setTitle(title ?: "Sin título")
        .setArtist(artist ?: "Artista desconocido")
        .setAlbumTitle(album ?: "Álbum desconocido")
        .setIsBrowsable(false)
        .setIsPlayable(true)
        .setMediaType(MediaMetadata.MEDIA_TYPE_MUSIC)
      if (!artworkUri.isNullOrBlank()) {
        val localFile = AudioMetadataExtractor.resolveLocalFile(artworkUri)
        if (localFile != null && localFile.exists() && localFile.canRead()) {
          runCatching {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(localFile.absolutePath, bounds)
            val maxDim = maxOf(bounds.outWidth, bounds.outHeight)
            var sampleSize = 1
            while (maxDim / sampleSize > 384) {
              sampleSize *= 2
            }
            val opts = BitmapFactory.Options().apply { inSampleSize = sampleSize }
            val bmp = BitmapFactory.decodeFile(localFile.absolutePath, opts)
            if (bmp != null) {
              val baos = ByteArrayOutputStream()
              bmp.compress(Bitmap.CompressFormat.JPEG, 85, baos)
              bmp.recycle()
              builder.setArtworkData(baos.toByteArray(), MediaMetadata.PICTURE_TYPE_FRONT_COVER)
            }
          }
        } else {
          runCatching { builder.setArtworkUri(Uri.parse(artworkUri)) }
        }
      }
      return builder.build()
    }

    fun buildMediaItem(
      mediaId: String,
      uri: String,
      title: String?,
      artist: String?,
      album: String?,
      artworkUri: String?
    ): MediaItem {
      return MediaItem.Builder()
        .setMediaId(mediaId)
        .setUri(uri)
        .setMediaMetadata(buildMediaMetadata(title, artist, album, artworkUri))
        .build()
    }

    fun saveAndroidAutoCatalog(context: Context, catalogJson: String) {
      context.getSharedPreferences(AUTO_PREFS_NAME, MODE_PRIVATE)
        .edit()
        .putString(KEY_AUTO_CATALOG, catalogJson)
        .apply()
    }
  }
}

