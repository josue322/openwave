package expo.modules.openwavenative

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.BaseAudioProcessor
import androidx.media3.common.util.UnstableApi
import java.nio.ByteBuffer
import kotlin.math.abs

/**
 * Custom Media3 PCM AudioProcessor implementing smooth L/R stereo channel balance
 * without introducing distortion or allocation churn on the audio thread.
 */
@UnstableApi
class ChannelBalanceAudioProcessor : BaseAudioProcessor() {

  @Volatile
  var balance: Float = 0f
    set(value) {
      field = value.coerceIn(-1f, 1f)
    }

  override fun onConfigure(
    inputAudioFormat: AudioProcessor.AudioFormat
  ): AudioProcessor.AudioFormat {
    if (inputAudioFormat.channelCount != 2) {
      return AudioProcessor.AudioFormat.NOT_SET
    }
    if (
      inputAudioFormat.encoding != C.ENCODING_PCM_16BIT &&
      inputAudioFormat.encoding != C.ENCODING_PCM_FLOAT
    ) {
      throw AudioProcessor.UnhandledAudioFormatException(inputAudioFormat)
    }
    return inputAudioFormat
  }

  override fun queueInput(inputBuffer: ByteBuffer) {
    val position = inputBuffer.position()
    val limit = inputBuffer.limit()
    val remaining = limit - position
    if (remaining <= 0) return

    val currentBalance = balance
    val outputBuffer = replaceOutputBuffer(remaining)

    // Fast path when centered: zero arithmetic overhead
    if (abs(currentBalance) < 0.01f) {
      outputBuffer.put(inputBuffer)
      outputBuffer.flip()
      return
    }

    val leftGain = if (currentBalance > 0f) (1f - currentBalance).coerceIn(0f, 1f) else 1f
    val rightGain = if (currentBalance < 0f) (1f + currentBalance).coerceIn(0f, 1f) else 1f

    when (inputAudioFormat.encoding) {
      C.ENCODING_PCM_16BIT -> {
        while (inputBuffer.remaining() >= 4) {
          val left = (inputBuffer.short * leftGain)
            .toInt()
            .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
            .toShort()
          val right = (inputBuffer.short * rightGain)
            .toInt()
            .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
            .toShort()
          outputBuffer.putShort(left)
          outputBuffer.putShort(right)
        }
        // Preserve any trailing fractional bytes safely
        while (inputBuffer.hasRemaining()) {
          outputBuffer.put(inputBuffer.get())
        }
      }
      C.ENCODING_PCM_FLOAT -> {
        while (inputBuffer.remaining() >= 8) {
          val left = (inputBuffer.float * leftGain).coerceIn(-1f, 1f)
          val right = (inputBuffer.float * rightGain).coerceIn(-1f, 1f)
          outputBuffer.putFloat(left)
          outputBuffer.putFloat(right)
        }
        while (inputBuffer.hasRemaining()) {
          outputBuffer.put(inputBuffer.get())
        }
      }
      else -> {
        outputBuffer.put(inputBuffer)
      }
    }

    outputBuffer.flip()
  }
}

