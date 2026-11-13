package expo.modules.openwavenative

import android.bluetooth.BluetoothA2dp
import android.bluetooth.BluetoothHeadset
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import androidx.annotation.OptIn
import androidx.core.content.ContextCompat
import androidx.media3.common.util.UnstableApi
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference

/**
 * Expo Modules API entry point bridging TypeScript OpenWave app logic with:
 * - AndroidX Media3 MediaLibraryService (ExoPlayer + Android Auto + Notification/Lock Screen)
 * - Native Hardware AudioEffect DSP & custom PCM L/R Channel Balance
 * - MediaMetadataRetriever + atomic MP3 ID3v2.3 writer
 * - Home Screen AppWidget updates
 * - Google Cast SDK media casting
 * - Wired headset & Bluetooth headphone connection/disconnection receiver
 */
@OptIn(UnstableApi::class)
class OpenWaveNativeModule : Module() {

  private var headphoneReceiver: BroadcastReceiver? = null
  private var castController: OpenWaveCastController? = null

  override fun definition() = ModuleDefinition {
    Name("OpenWaveNative")

    Events(
      "onPlaybackStatus",
      "onHeadphoneEvent",
      "onWidgetAction",
      "onCastStateChanged",
      "onRemoteCommand"
    )

    OnCreate {
      activeModuleRef = WeakReference(this@OpenWaveNativeModule)
      val context = appContext.reactContext ?: return@OnCreate
      registerHeadphoneReceiver(context)
      castController = OpenWaveCastController(context).also {
        it.initializeOnMainThread()
      }
    }

    OnDestroy {
      val context = appContext.reactContext
      if (context != null && headphoneReceiver != null) {
        runCatching { context.unregisterReceiver(headphoneReceiver) }
      }
      headphoneReceiver = null
      castController?.release()
      castController = null
      activeModuleRef = null
    }

    Function("isNativeAvailable") {
      true
    }

    // ---- Media3 Playback Control ----

    AsyncFunction("loadTrack") {
      uri: String,
      shouldPlay: Boolean,
      title: String?,
      artist: String?,
      album: String?,
      artworkUri: String? ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      OpenWaveMediaService.withService(context) { service ->
        service.loadTrack(uri, shouldPlay, title, artist, album, artworkUri)
      }
      true
    }

    AsyncFunction("updateMetadata") {
      title: String?,
      artist: String?,
      album: String?,
      artworkUri: String? ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      OpenWaveMediaService.withService(context) { service ->
        service.updateCurrentMetadata(title, artist, album, artworkUri)
      }
      true
    }

    AsyncFunction("play") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      OpenWaveMediaService.withService(context) { it.play() }
      true
    }

    AsyncFunction("pause") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      OpenWaveMediaService.withService(context) { it.pause() }
      true
    }

    AsyncFunction("stop") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      OpenWaveMediaService.withService(context) { it.stopPlayback() }
      true
    }

    AsyncFunction("seekTo") { positionMs: Double ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      OpenWaveMediaService.withService(context) { it.seekTo(positionMs.toLong()) }
      true
    }

    AsyncFunction("setVolume") { volume: Double ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      OpenWaveMediaService.withService(context) { it.setVolume(volume.toFloat()) }
      true
    }

    AsyncFunction("setPlaybackSpeed") { speed: Double ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      OpenWaveMediaService.withService(context) { it.setPlaybackSpeed(speed.toFloat()) }
      true
    }

    // ---- Native Hardware AudioEffect DSP + Stereo Balance ----

    AsyncFunction("applyDspConfig") { payload: Map<String, Any?> ->
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("applied" to false)
      @Suppress("UNCHECKED_CAST")
      val rawBands = (payload["bandGainsDb"] as? List<Any?>)
        ?.mapNotNull { (it as? Number)?.toDouble() }
        ?: emptyList()

      val config = DspConfigPayload(
        enabled = payload["enabled"] as? Boolean ?: false,
        bandGainsDb = rawBands,
        bassBoost = (payload["bassBoost"] as? Number)?.toInt() ?: 0,
        trebleBoost = (payload["trebleBoost"] as? Number)?.toInt() ?: 0,
        surround = (payload["surround"] as? Number)?.toInt() ?: 0,
        virtualizer = (payload["virtualizer"] as? Number)?.toInt() ?: 0,
        balance = (payload["balance"] as? Number)?.toInt() ?: 0,
        preampGainDb = (payload["preampGainDb"] as? Number)?.toDouble() ?: 0.0,
        normalizeVolume = payload["normalizeVolume"] as? Boolean ?: false
      )

      OpenWaveMediaService.withService(context) { service ->
        service.applyDspConfig(config)
      }
      mapOf("applied" to true)
    }

    // ---- Audio Metadata Extraction & Atomic MP3 ID3 Writer ----

    AsyncFunction("extractMetadata") { uri: String ->
      val context = appContext.reactContext ?: return@AsyncFunction emptyMap<String, Any?>()
      AudioMetadataExtractor.extract(context, uri)
    }

    AsyncFunction("writeId3Tags") {
      uri: String,
      title: String?,
      artist: String?,
      album: String?,
      genre: String?,
      artworkUri: String? ->
      val res = Id3TagWriter.writeMp3Tags(uri, title, artist, album, genre, artworkUri)
      mapOf("success" to res.success, "message" to res.message)
    }

    // ---- Android Home Screen Widget & Android Auto Catalog ----

    Function("updateWidgetState") {
      title: String,
      artist: String,
      artworkUri: String?,
      isPlaying: Boolean ->
      val context = appContext.reactContext ?: return@Function false
      OpenWaveWidgetProvider.saveAndRefreshAll(context, title, artist, artworkUri, isPlaying)
      true
    }

    Function("syncAndroidAutoCatalog") { catalogJson: String ->
      val context = appContext.reactContext ?: return@Function false
      OpenWaveMediaService.saveAndroidAutoCatalog(context, catalogJson)
      true
    }

    // ---- Google Cast / Chromecast ----

    AsyncFunction("getCastState") {
      castController?.getStatusSync() ?: mapOf(
        "available" to false,
        "connected" to false,
        "state" to "unavailable"
      )
    }

    AsyncFunction("openCastPicker") {
      castController?.openRoutePicker(appContext.currentActivity) ?: false
    }

    AsyncFunction("castTrack") {
      uri: String,
      title: String,
      artist: String,
      album: String,
      artworkUri: String?,
      positionMs: Double ->
      castController?.castTrack(
        uri = uri,
        title = title,
        artist = artist,
        album = album,
        artworkUri = artworkUri,
        positionMs = positionMs.toLong()
      ) ?: mapOf("started" to false, "message" to "Controlador Cast no inicializado.")
    }

    AsyncFunction("stopCast") {
      castController?.stopCast() ?: false
    }
  }

  private fun registerHeadphoneReceiver(context: Context) {
    if (headphoneReceiver != null) return
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context, intent: Intent) {
        when (intent.action) {
          Intent.ACTION_HEADSET_PLUG -> {
            val state = intent.getIntExtra("state", -1)
            val name = intent.getStringExtra("name") ?: "Audífonos por cable"
            if (state == 1) {
              emitHeadphoneEvent(connected = true, deviceType = "wired", deviceName = name)
            } else if (state == 0) {
              emitHeadphoneEvent(connected = false, deviceType = "wired", deviceName = name)
            }
          }
          AudioManager.ACTION_AUDIO_BECOMING_NOISY -> {
            emitHeadphoneEvent(
              connected = false,
              deviceType = "audio_becoming_noisy",
              deviceName = "Salida de audio desconectada"
            )
          }
          BluetoothA2dp.ACTION_CONNECTION_STATE_CHANGED,
          BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED -> {
            val state = intent.getIntExtra(BluetoothProfile.EXTRA_STATE, -1)
            if (state == BluetoothProfile.STATE_CONNECTED) {
              emitHeadphoneEvent(
                connected = true,
                deviceType = "bluetooth",
                deviceName = "Audio Bluetooth"
              )
            } else if (state == BluetoothProfile.STATE_DISCONNECTED) {
              emitHeadphoneEvent(
                connected = false,
                deviceType = "bluetooth",
                deviceName = "Audio Bluetooth"
              )
            }
          }
        }
      }
    }

    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_HEADSET_PLUG)
      addAction(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
      addAction(BluetoothA2dp.ACTION_CONNECTION_STATE_CHANGED)
      addAction(BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED)
    }

    ContextCompat.registerReceiver(context, receiver, filter, ContextCompat.RECEIVER_EXPORTED)
    headphoneReceiver = receiver
  }

  private fun emitHeadphoneEvent(connected: Boolean, deviceType: String, deviceName: String) {
    runCatching {
      sendEvent(
        "onHeadphoneEvent",
        mapOf(
          "connected" to connected,
          "deviceType" to deviceType,
          "deviceName" to deviceName
        )
      )
    }
  }

  companion object {
    @Volatile
    private var activeModuleRef: WeakReference<OpenWaveNativeModule>? = null

    fun emitPlaybackStatus(payload: Map<String, Any?>) {
      runCatching { activeModuleRef?.get()?.sendEvent("onPlaybackStatus", payload) }
    }

    fun emitWidgetAction(action: String) {
      runCatching {
        activeModuleRef?.get()?.sendEvent("onWidgetAction", mapOf("action" to action))
      }
    }

    fun emitRemoteCommand(command: String) {
      runCatching {
        activeModuleRef?.get()?.sendEvent("onRemoteCommand", mapOf("command" to command))
      }
    }

    fun emitCastStateChanged(payload: Map<String, Any?>) {
      runCatching { activeModuleRef?.get()?.sendEvent("onCastStateChanged", payload) }
    }
  }
}

