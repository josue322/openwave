package expo.modules.openwavenative

import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.charset.Charset

/**
 * Pure Kotlin atomic ID3v2.3 tag updater for writable local MP3 files.
 * Preserves existing non-updated frames (such as embedded APIC cover art) and uses
 * UTF-16LE with BOM so Spanish characters render properly in all players.
 */
object Id3TagWriter {

  data class WriteResult(
    val success: Boolean,
    val message: String
  )

  private val MANAGED_FRAME_IDS = setOf("TIT2", "TPE1", "TALB", "TCON")

  fun writeMp3Tags(
    uriString: String,
    title: String?,
    artist: String?,
    album: String?,
    genre: String?,
    artworkUri: String?
  ): WriteResult {
    val file = AudioMetadataExtractor.resolveLocalFile(uriString)
      ?: return WriteResult(
        false,
        "El archivo usa content:// protegido por Android Scoped Storage; metadatos actualizados en la biblioteca OpenWave."
      )

    if (!file.exists() || !file.canRead() || !file.canWrite()) {
      return WriteResult(
        false,
        "Sin permiso de escritura directa sobre el archivo físico; cambios guardados en OpenWave."
      )
    }

    val isMp3 = file.name.lowercase().endsWith(".mp3")
    if (!isMp3) {
      return WriteResult(
        false,
        "Escritura física ID3 solo aplica a MP3; metadatos actualizados en la base de datos local."
      )
    }

    return try {
      val header = ByteArray(10)
      val fileLen = file.length()
      var oldTagTotalSize = 0
      val preservedFrames = mutableListOf<Pair<String, ByteArray>>()

      if (fileLen >= 10) {
        FileInputStream(file).use { fis ->
          val read = fis.read(header)
          if (
            read == 10 &&
            header[0] == 'I'.code.toByte() &&
            header[1] == 'D'.code.toByte() &&
            header[2] == '3'.code.toByte()
          ) {
            val majorVersion = header[3].toInt() and 0xFF
            val tagPayloadSize = decodeSynchsafeInt(header, 6)
            if (tagPayloadSize >= 0 && tagPayloadSize + 10L <= fileLen) {
              oldTagTotalSize = tagPayloadSize + 10
              // Preserve untouched frames (including APIC unless a new cover is explicitly given)
              if (majorVersion in 3..4 && tagPayloadSize <= 8 * 1024 * 1024) {
                val payload = ByteArray(tagPayloadSize)
                var offset = 0
                while (offset < tagPayloadSize) {
                  val r = fis.read(payload, offset, tagPayloadSize - offset)
                  if (r <= 0) break
                  offset += r
                }
                parseExistingFrames(payload, majorVersion, artworkUri != null, preservedFrames)
              }
            }
          }
        }
      }

      val framesOut = ByteArrayOutputStream()
      // Write preserved frames first
      for ((frameId, framePayload) in preservedFrames) {
        writeId3v23Frame(framesOut, frameId, framePayload)
      }
      // Append updated text frames
      title?.takeIf { it.isNotBlank() }?.let { writeTextFrame(framesOut, "TIT2", it) }
      artist?.takeIf { it.isNotBlank() }?.let { writeTextFrame(framesOut, "TPE1", it) }
      album?.takeIf { it.isNotBlank() }?.let { writeTextFrame(framesOut, "TALB", it) }
      genre?.takeIf { it.isNotBlank() }?.let { writeTextFrame(framesOut, "TCON", it) }

      // Write new embedded APIC artwork if local readable file provided
      if (!artworkUri.isNullOrBlank()) {
        val artFile = AudioMetadataExtractor.resolveLocalFile(artworkUri)
        if (artFile != null && artFile.exists() && artFile.length() in 1L..(4L * 1024L * 1024L)) {
          val imgBytes = artFile.readBytes()
          val mime = if (artFile.name.lowercase().endsWith(".png")) "image/png" else "image/jpeg"
          writeApicFrame(framesOut, mime, imgBytes)
        }
      }

      val frameBytes = framesOut.toByteArray()
      val paddingSize = 512
      val newPayloadSize = frameBytes.size + paddingSize
      val synchSize = encodeSynchsafeInt(newPayloadSize)

      val newHeader = byteArrayOf(
        'I'.code.toByte(),
        'D'.code.toByte(),
        '3'.code.toByte(),
        3, // ID3v2.3
        0,
        0,
        synchSize[0],
        synchSize[1],
        synchSize[2],
        synchSize[3]
      )

      val tempFile = File(file.parentFile, ".${file.name}.openwave.tmp")
      FileOutputStream(tempFile).use { fos ->
        fos.write(newHeader)
        fos.write(frameBytes)
        fos.write(ByteArray(paddingSize))

        FileInputStream(file).use { fis ->
          var remainingToSkip = oldTagTotalSize.toLong()
          while (remainingToSkip > 0) {
            val skipped = fis.skip(remainingToSkip)
            if (skipped <= 0) break
            remainingToSkip -= skipped
          }
          val buffer = ByteArray(16384)
          while (true) {
            val count = fis.read(buffer)
            if (count <= 0) break
            fos.write(buffer, 0, count)
          }
        }
        fos.flush()
      }

      if (!tempFile.renameTo(file)) {
        // Fallback overwrite copy if rename fails across mounts
        tempFile.inputStream().use { input ->
          file.outputStream().use { output -> input.copyTo(output) }
        }
        tempFile.delete()
      }

      WriteResult(true, "Etiquetas ID3v2.3 escritas directamente en el archivo MP3.")
    } catch (e: Throwable) {
      WriteResult(
        false,
        "No se pudo modificar el archivo MP3 (${e.message ?: "error de E/S"}); guardado en biblioteca OpenWave."
      )
    }
  }

  private fun parseExistingFrames(
    payload: ByteArray,
    majorVersion: Int,
    replacingArt: Boolean,
    out: MutableList<Pair<String, ByteArray>>
  ) {
    var pos = 0
    while (pos + 10 <= payload.size) {
      if (payload[pos] == 0.toByte()) break
      val frameId = String(payload, pos, 4, Charsets.US_ASCII)
      if (!frameId.all { it.isLetterOrDigit() }) break
      val frameSize = if (majorVersion == 4) {
        decodeSynchsafeInt(payload, pos + 4)
      } else {
        decodeBigEndianInt(payload, pos + 4)
      }
      if (frameSize <= 0 || pos + 10 + frameSize > payload.size) break

      val shouldReplace = frameId in MANAGED_FRAME_IDS || (replacingArt && frameId == "APIC")
      if (!shouldReplace) {
        val frameData = payload.copyOfRange(pos + 10, pos + 10 + frameSize)
        out.add(frameId to frameData)
      }
      pos += 10 + frameSize
    }
  }

  private fun writeTextFrame(out: ByteArrayOutputStream, frameId: String, text: String) {
    val textBytes = text.toByteArray(Charset.forName("UTF-16LE"))
    val payload = ByteArray(3 + textBytes.size)
    payload[0] = 0x01 // UTF-16 with BOM
    payload[1] = 0xFF.toByte()
    payload[2] = 0xFE.toByte()
    System.arraycopy(textBytes, 0, payload, 3, textBytes.size)
    writeId3v23Frame(out, frameId, payload)
  }

  private fun writeApicFrame(out: ByteArrayOutputStream, mime: String, imageBytes: ByteArray) {
    val mimeBytes = mime.toByteArray(Charsets.ISO_8859_1)
    val payload = ByteArrayOutputStream()
    payload.write(0x00) // ISO-8859-1 description
    payload.write(mimeBytes)
    payload.write(0x00) // null terminator after MIME
    payload.write(0x03) // Picture type: Cover (front)
    payload.write(0x00) // Empty description terminator
    payload.write(imageBytes)
    writeId3v23Frame(out, "APIC", payload.toByteArray())
  }

  private fun writeId3v23Frame(out: ByteArrayOutputStream, frameId: String, payload: ByteArray) {
    val idBytes = frameId.take(4).padEnd(4, ' ').toByteArray(Charsets.US_ASCII)
    out.write(idBytes)
    val size = payload.size
    out.write((size ushr 24) and 0xFF)
    out.write((size ushr 16) and 0xFF)
    out.write((size ushr 8) and 0xFF)
    out.write(size and 0xFF)
    out.write(0)
    out.write(0)
    out.write(payload)
  }

  private fun decodeSynchsafeInt(bytes: ByteArray, offset: Int): Int {
    return ((bytes[offset].toInt() and 0x7F) shl 21) or
      ((bytes[offset + 1].toInt() and 0x7F) shl 14) or
      ((bytes[offset + 2].toInt() and 0x7F) shl 7) or
      (bytes[offset + 3].toInt() and 0x7F)
  }

  private fun decodeBigEndianInt(bytes: ByteArray, offset: Int): Int {
    return ((bytes[offset].toInt() and 0xFF) shl 24) or
      ((bytes[offset + 1].toInt() and 0xFF) shl 16) or
      ((bytes[offset + 2].toInt() and 0xFF) shl 8) or
      (bytes[offset + 3].toInt() and 0xFF)
  }

  private fun encodeSynchsafeInt(value: Int): ByteArray {
    return byteArrayOf(
      ((value ushr 21) and 0x7F).toByte(),
      ((value ushr 14) and 0x7F).toByte(),
      ((value ushr 7) and 0x7F).toByte(),
      (value and 0x7F).toByte()
    )
  }
}

