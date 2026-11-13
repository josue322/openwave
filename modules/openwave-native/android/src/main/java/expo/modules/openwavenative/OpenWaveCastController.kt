package expo.modules.openwavenative

import android.app.Activity
import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.fragment.app.FragmentActivity
import androidx.mediarouter.app.MediaRouteChooserDialog
import com.google.android.gms.cast.MediaInfo
import com.google.android.gms.cast.MediaLoadRequestData
import com.google.android.gms.cast.MediaMetadata
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.CastState
import com.google.android.gms.cast.framework.CastStateListener
import com.google.android.gms.common.images.WebImage

/**
 * Safely manages Chromecast discovery and remote media loading when Google Play Services
 * Cast Framework is available on the Android device.
 */
class OpenWaveCastController(private val context: Context) {

  private val mainHandler = Handler(Looper.getMainLooper())
  private var stateListenerRegistered = false

  private val stateListener = CastStateListener { newState ->
    OpenWaveNativeModule.emitCastStateChanged(buildStateMap(newState))
  }

  fun initializeOnMainThread() {
    mainHandler.post {
      runCatching {
        val castContext = CastContext.getSharedInstance(context)
        if (!stateListenerRegistered) {
          castContext.addCastStateListener(stateListener)
          stateListenerRegistered = true
        }
      }
    }
  }

  fun getStatusSync(): Map<String, Any?> {
    return runCatching {
      val castContext = CastContext.getSharedInstance(context)
      buildStateMap(castContext.castState, castContext.sessionManager.currentCastSession)
    }.getOrElse {
      mapOf(
        "available" to false,
        "connected" to false,
        "state" to "unavailable",
        "deviceName" to null,
        "reason" to "Google Cast no disponible en este dispositivo o entorno."
      )
    }
  }

  fun openRoutePicker(activity: Activity?): Boolean {
    val castContext = runCatching { CastContext.getSharedInstance(context) }.getOrNull()
      ?: return false
    val selector = castContext.mergedSelector ?: return false
    if (activity !is FragmentActivity) return false
    mainHandler.post {
      runCatching {
        val dialog = MediaRouteChooserDialog(activity)
        dialog.routeSelector = selector
        dialog.show()
      }
    }
    return true
  }

  fun castTrack(
    uri: String,
    title: String,
    artist: String,
    album: String,
    artworkUri: String?,
    positionMs: Long
  ): Map<String, Any?> {
    if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
      return mapOf(
        "started" to false,
        "requiresHttpSource" to true,
        "message" to "Chromecast admite transmisión cuando la fuente es un flujo online HTTP/HTTPS."
      )
    }

    val castContext = runCatching { CastContext.getSharedInstance(context) }.getOrNull()
      ?: return mapOf(
        "started" to false,
        "message" to "Google Cast no está disponible en este dispositivo."
      )

    val session: CastSession? = runCatching {
      castContext.sessionManager.currentCastSession
    }.getOrNull()

    if (session == null || !session.isConnected) {
      return mapOf(
        "started" to false,
        "needsDevicePicker" to true,
        "message" to "Selecciona un dispositivo Chromecast compatible en tu red Wi‑Fi."
      )
    }

    val remoteClient = session.remoteMediaClient
      ?: return mapOf("started" to false, "message" to "Cliente remoto Cast aún no inicializado.")

    val metadata = MediaMetadata(MediaMetadata.MEDIA_TYPE_MUSIC_TRACK).apply {
      putString(MediaMetadata.KEY_TITLE, title)
      putString(MediaMetadata.KEY_ARTIST, artist)
      putString(MediaMetadata.KEY_ALBUM_TITLE, album)
      if (!artworkUri.isNullOrBlank() && (artworkUri.startsWith("http://") || artworkUri.startsWith("https://"))) {
        addImage(WebImage(Uri.parse(artworkUri)))
      }
    }

    val mediaInfo = MediaInfo.Builder(uri)
      .setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)
      .setContentType("audio/mpeg")
      .setMetadata(metadata)
      .build()

    val request = MediaLoadRequestData.Builder()
      .setMediaInfo(mediaInfo)
      .setAutoplay(true)
      .setCurrentTime(positionMs.coerceAtLeast(0L))
      .build()

    mainHandler.post {
      runCatching { remoteClient.load(request) }
    }

    return mapOf(
      "started" to true,
      "deviceName" to (session.castDevice?.friendlyName ?: "Chromecast"),
      "message" to "Transmitiendo a ${session.castDevice?.friendlyName ?: "Chromecast"}."
    )
  }

  fun stopCast(): Boolean {
    return runCatching {
      val sessionManager = CastContext.getSharedInstance(context).sessionManager
      mainHandler.post {
        runCatching { sessionManager.endCurrentSession(true) }
      }
      true
    }.getOrDefault(false)
  }

  private fun buildStateMap(
    castState: Int,
    session: CastSession? = runCatching {
      CastContext.getSharedInstance(context).sessionManager.currentCastSession
    }.getOrNull()
  ): Map<String, Any?> {
    val stateLabel = when (castState) {
      CastState.NO_DEVICES_AVAILABLE -> "no_devices"
      CastState.NOT_CONNECTED -> "not_connected"
      CastState.CONNECTING -> "connecting"
      CastState.CONNECTED -> "connected"
      else -> "unknown"
    }
    return mapOf(
      "available" to (castState != CastState.NO_DEVICES_AVAILABLE),
      "connected" to (castState == CastState.CONNECTED && session?.isConnected == true),
      "state" to stateLabel,
      "deviceName" to session?.castDevice?.friendlyName
    )
  }

  fun release() {
    if (stateListenerRegistered) {
      runCatching {
        CastContext.getSharedInstance(context).removeCastStateListener(stateListener)
      }
      stateListenerRegistered = false
    }
  }
}

