package expo.modules.openwavenative

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.widget.RemoteViews

/**
 * Android Home Screen 4x1 Widget for OpenWave.
 * Persists lightweight state in SharedPreferences and dispatches Prev / PlayPause / Next
 * actions to OpenWaveMediaService + JS module listener.
 */
class OpenWaveWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    for (widgetId in appWidgetIds) {
      updateSingleWidget(context, appWidgetManager, widgetId)
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    val action = intent.action ?: return
    if (
      action == ACTION_PREV ||
      action == ACTION_PLAY_PAUSE ||
      action == ACTION_NEXT
    ) {
      val mappedAction = when (action) {
        ACTION_PREV -> "prev"
        ACTION_PLAY_PAUSE -> "play_pause"
        else -> "next"
      }
      // Notify active JS playback engine first so queue/shuffle/crossfade stay synced
      OpenWaveNativeModule.emitWidgetAction(mappedAction)

      // Immediate native fallback if service is active and JS bridge is paused/detached
      OpenWaveMediaService.currentInstance?.handleDirectWidgetAction(mappedAction)
    }
  }

  companion object {
    const val ACTION_PREV = "expo.modules.openwavenative.WIDGET_ACTION_PREV"
    const val ACTION_PLAY_PAUSE = "expo.modules.openwavenative.WIDGET_ACTION_PLAY_PAUSE"
    const val ACTION_NEXT = "expo.modules.openwavenative.WIDGET_ACTION_NEXT"

    private const val PREFS_NAME = "openwave_widget_state"
    private const val KEY_TITLE = "title"
    private const val KEY_ARTIST = "artist"
    private const val KEY_ARTWORK = "artworkUri"
    private const val KEY_IS_PLAYING = "isPlaying"

    fun saveAndRefreshAll(
      context: Context,
      title: String,
      artist: String,
      artworkUri: String?,
      isPlaying: Boolean
    ) {
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
        .putString(KEY_TITLE, title)
        .putString(KEY_ARTIST, artist)
        .putString(KEY_ARTWORK, artworkUri)
        .putBoolean(KEY_IS_PLAYING, isPlaying)
        .apply()

      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, OpenWaveWidgetProvider::class.java)
      val ids = manager.getAppWidgetIds(component)
      for (id in ids) {
        updateSingleWidget(context, manager, id)
      }
    }

    private fun updateSingleWidget(
      context: Context,
      manager: AppWidgetManager,
      widgetId: Int
    ) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val title = prefs.getString(KEY_TITLE, null)?.takeIf { it.isNotBlank() } ?: "OPENWAVE"
      val artist = prefs.getString(KEY_ARTIST, null)?.takeIf { it.isNotBlank() }
        ?: "Toca para abrir tu música"
      val artworkUri = prefs.getString(KEY_ARTWORK, null)
      val isPlaying = prefs.getBoolean(KEY_IS_PLAYING, false)

      val views = RemoteViews(context.packageName, R.layout.openwave_widget)
      views.setTextViewText(R.id.widget_title, title)
      views.setTextViewText(R.id.widget_artist, artist)
      views.setImageViewResource(
        R.id.widget_btn_play_pause,
        if (isPlaying) R.drawable.ic_widget_pause else R.drawable.ic_widget_play
      )

      val bitmap = decodeSmallLocalArtwork(artworkUri)
      if (bitmap != null) {
        views.setImageViewBitmap(R.id.widget_artwork, bitmap)
      } else {
        views.setImageViewResource(R.id.widget_artwork, R.drawable.ic_widget_note)
      }

      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launchIntent != null) {
        val openPending = PendingIntent.getActivity(
          context,
          100,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, openPending)
      }

      views.setOnClickPendingIntent(
        R.id.widget_btn_prev,
        createBroadcastPendingIntent(context, ACTION_PREV, 101)
      )
      views.setOnClickPendingIntent(
        R.id.widget_btn_play_pause,
        createBroadcastPendingIntent(context, ACTION_PLAY_PAUSE, 102)
      )
      views.setOnClickPendingIntent(
        R.id.widget_btn_next,
        createBroadcastPendingIntent(context, ACTION_NEXT, 103)
      )

      manager.updateAppWidget(widgetId, views)
    }

    private fun createBroadcastPendingIntent(
      context: Context,
      action: String,
      requestCode: Int
    ): PendingIntent {
      val intent = Intent(context, OpenWaveWidgetProvider::class.java).apply {
        this.action = action
      }
      return PendingIntent.getBroadcast(
        context,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    private fun decodeSmallLocalArtwork(artworkUri: String?): Bitmap? {
      if (artworkUri.isNullOrBlank()) return null
      val file = AudioMetadataExtractor.resolveLocalFile(artworkUri) ?: return null
      if (!file.exists() || !file.canRead()) return null
      return runCatching {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.absolutePath, bounds)
        val maxDim = maxOf(bounds.outWidth, bounds.outHeight)
        var sampleSize = 1
        while (maxDim / sampleSize > 192) {
          sampleSize *= 2
        }
        val opts = BitmapFactory.Options().apply { inSampleSize = sampleSize }
        BitmapFactory.decodeFile(file.absolutePath, opts)
      }.getOrNull()
    }
  }
}

