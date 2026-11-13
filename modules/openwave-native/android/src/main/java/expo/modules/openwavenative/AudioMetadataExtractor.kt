package expo.modules.openwavenative

import android.content.Context
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest

/**
 * Extracts real technical metadata, tags, bitrate, sample rate, file size,
 * and embedded album art from local audio files via Android MediaMetadataRetriever + MediaExtractor.
 */
object AudioMetadataExtractor {

  fun extract(context: Context, uriString: String): Map<String, Any?> {
    val retriever = MediaMetadataRetriever()
    val extractor = MediaExtractor()
    val resolvedFile = resolveLocalFile(uriString)
    val parsedUri = Uri.parse(uriString)

    var title: String? = null
    var artistName: String? = null
    var albumTitle: String? = null
    var genre: String? = null
    var year: Int? = null
    var durationMs: Long? = null
    var bitrateKbps: Int? = null
    var sampleRateHz: Int? = null
    var mimeType: String? = null
    var artworkUri: String? = null
    var fileSizeBytes: Long? = null
    var isCorrupt = false

    try {
      if (resolvedFile != null) {
        if (!resolvedFile.exists() || !resolvedFile.canRead() || resolvedFile.length() <= 0L) {
          return mapOf(
            "isCorrupt" to true,
            "fileSize" to (resolvedFile.takeIf { it.exists() }?.length() ?: 0L)
          )
        }
        fileSizeBytes = resolvedFile.length()
        retriever.setDataSource(resolvedFile.absolutePath)
      } else {
        retriever.setDataSource(context, parsedUri)
        fileSizeBytes = runCatching {
          context.contentResolver.openAssetFileDescriptor(parsedUri, "r")?.use { fd ->
            fd.length.takeIf { it >= 0L }
          }
        }.getOrNull()
      }

      title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE)
        ?.trim()?.takeIf { it.isNotEmpty() }
      artistName = (
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)
          ?: retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUMARTIST)
        )?.trim()?.takeIf { it.isNotEmpty() }
      albumTitle = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM)
        ?.trim()?.takeIf { it.isNotEmpty() }
      genre = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_GENRE)
        ?.trim()?.takeIf { it.isNotEmpty() }
      year = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_YEAR)
        ?.trim()?.toIntOrNull()
      durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
        ?.trim()?.toLongOrNull()
      bitrateKbps = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE)
        ?.trim()?.toIntOrNull()?.let { bps -> (bps / 1000).takeIf { it > 0 } }
      mimeType = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE)
        ?.trim()?.takeIf { it.isNotEmpty() }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        sampleRateHz = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_SAMPLERATE)
          ?.trim()?.toIntOrNull()
      }

      // Extract embedded cover artwork deterministically into app filesDir
      val pictureBytes = runCatching { retriever.embeddedPicture }.getOrNull()
      if (pictureBytes != null && pictureBytes.isNotEmpty()) {
        artworkUri = persistEmbeddedArtwork(context, pictureBytes)
      }

      // Inspect exact MediaFormat (sample rate, MIME fallback) via MediaExtractor
      if (sampleRateHz == null || mimeType == null) {
        runCatching {
          if (resolvedFile != null) {
            extractor.setDataSource(resolvedFile.absolutePath)
          } else {
            extractor.setDataSource(context, parsedUri, null)
          }
          for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val trackMime = format.getString(MediaFormat.KEY_MIME)
            if (trackMime?.startsWith("audio/") == true) {
              if (mimeType == null) mimeType = trackMime
              if (sampleRateHz == null && format.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
                sampleRateHz = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
              }
              if (bitrateKbps == null && format.containsKey(MediaFormat.KEY_BIT_RATE)) {
                val bps = format.getInteger(MediaFormat.KEY_BIT_RATE)
                if (bps > 0) bitrateKbps = bps / 1000
              }
              break
            }
          }
        }
      }
    } catch (_: Throwable) {
      isCorrupt = true
    } finally {
      runCatching { retriever.release() }
      runCatching { extractor.release() }
    }

    return mapOf(
      "title" to title,
      "artistName" to artistName,
      "albumTitle" to albumTitle,
      "genre" to genre,
      "year" to year,
      "duration" to durationMs,
      "bitrate" to bitrateKbps,
      "sampleRate" to sampleRateHz,
      "mimeType" to mimeType,
      "artworkUri" to artworkUri,
      "fileSize" to fileSizeBytes,
      "isCorrupt" to isCorrupt
    )
  }

  private fun persistEmbeddedArtwork(context: Context, bytes: ByteArray): String? {
    return runCatching {
      val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
      val hash = digest.take(12).joinToString("") { "%02x".format(it) }
      val artDir = File(context.filesDir, "openwave_artwork")
      if (!artDir.exists()) artDir.mkdirs()
      val ext = if (bytes.size >= 4 &&
        bytes[0] == 0x89.toByte() &&
        bytes[1] == 0x50.toByte()
      ) "png" else "jpg"
      val outFile = File(artDir, "$hash.$ext")
      if (!outFile.exists() || outFile.length() == 0L) {
        FileOutputStream(outFile).use { it.write(bytes) }
      }
      "file://${outFile.absolutePath}"
    }.getOrNull()
  }

  fun resolveLocalFile(uriString: String): File? {
    if (uriString.startsWith("file://")) {
      val path = Uri.parse(uriString).path ?: return null
      return File(path)
    }
    if (uriString.startsWith("/")) {
      return File(uriString)
    }
    return null
  }
}

