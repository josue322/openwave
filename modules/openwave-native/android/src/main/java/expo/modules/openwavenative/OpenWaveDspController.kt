package expo.modules.openwavenative

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.LoudnessEnhancer
import android.media.audiofx.Virtualizer
import androidx.media3.common.util.UnstableApi
import kotlin.math.abs
import kotlin.math.roundToInt

data class DspConfigPayload(
  val enabled: Boolean = false,
  val bandGainsDb: List<Double> = emptyList(),
  val bassBoost: Int = 0, // 0..100
  val trebleBoost: Int = 0, // 0..100
  val surround: Int = 0, // 0..100
  val virtualizer: Int = 0, // 0..100
  val balance: Int = 0, // -100..+100
  val preampGainDb: Double = 0.0, // -6..+6
  val normalizeVolume: Boolean = false
)

/**
 * Coordinates Android hardware/HAL AudioEffects (Equalizer, BassBoost, Virtualizer, LoudnessEnhancer)
 * bound to ExoPlayer's audioSessionId plus custom PCM ChannelBalanceAudioProcessor.
 */
@UnstableApi
class OpenWaveDspController(
  private val balanceProcessor: ChannelBalanceAudioProcessor
) {

  private var audioSessionId: Int = 0
  private var equalizer: Equalizer? = null
  private var bassBoostEffect: BassBoost? = null
  private var virtualizerEffect: Virtualizer? = null
  private var loudnessEnhancer: LoudnessEnhancer? = null
  private var lastConfig: DspConfigPayload = DspConfigPayload()

  @Synchronized
  fun attachToAudioSession(sessionId: Int) {
    if (sessionId <= 0 || sessionId == audioSessionId) {
      applyConfig(lastConfig)
      return
    }
    releaseEffects()
    audioSessionId = sessionId

    runCatching { equalizer = Equalizer(0, sessionId) }
    runCatching { bassBoostEffect = BassBoost(0, sessionId) }
    runCatching { virtualizerEffect = Virtualizer(0, sessionId) }
    runCatching { loudnessEnhancer = LoudnessEnhancer(sessionId) }

    applyConfig(lastConfig)
  }

  @Synchronized
  fun applyConfig(config: DspConfigPayload): Map<String, Any?> {
    lastConfig = config

    // Apply balance unconditionally on stereo PCM processor
    val normalizedBalance = (config.balance.coerceIn(-100, 100) / 100f)
    balanceProcessor.balance = if (config.enabled || abs(normalizedBalance) > 0.01f) {
      normalizedBalance
    } else {
      0f
    }

    val eq = equalizer
    if (eq != null) {
      runCatching {
        eq.enabled = config.enabled
        if (config.enabled) {
          val numBands = eq.numberOfBands.toInt()
          val range = eq.bandLevelRange
          val minMb = range[0].toInt()
          val maxMb = range[1].toInt()

          for (band in 0 until numBands) {
            val baseDb = config.bandGainsDb.getOrNull(band) ?: 0.0
            // Fold trebleBoost (0..100) onto highest frequency bands for crisp hardware treble control
            val trebleWeight = when {
              numBands >= 2 && band == numBands - 1 -> 6.0
              numBands >= 3 && band == numBands - 2 -> 3.0
              else -> 0.0
            }
            val trebleAddedDb = (config.trebleBoost.coerceIn(0, 100) / 100.0) * trebleWeight
            // When preampGain is negative, attenuate gently inside EQ range too
            val negPreampOffsetDb = if (config.preampGainDb < 0.0) config.preampGainDb else 0.0
            val totalMb = ((baseDb + trebleAddedDb + negPreampOffsetDb) * 100.0)
              .roundToInt()
              .coerceIn(minMb, maxMb)
              .toShort()
            eq.setBandLevel(band.toShort(), totalMb)
          }
        }
      }
    }

    val bass = bassBoostEffect
    if (bass != null) {
      runCatching {
        val active = config.enabled && config.bassBoost > 0
        bass.enabled = active
        if (active && bass.strengthSupported) {
          val strength = (config.bassBoost.coerceIn(0, 100) * 10).toShort()
          bass.setStrength(strength)
        }
      }
    }

    val virt = virtualizerEffect
    if (virt != null) {
      runCatching {
        val combinedStrength = maxOf(config.virtualizer, config.surround).coerceIn(0, 100)
        val active = config.enabled && combinedStrength > 0
        virt.enabled = active
        if (active && virt.strengthSupported) {
          virt.setStrength((combinedStrength * 10).toShort())
        }
      }
    }

    val loudness = loudnessEnhancer
    if (loudness != null) {
      runCatching {
        val normGainMb = if (config.normalizeVolume) 350 else 0
        val preampMb = if (config.enabled && config.preampGainDb > 0.0) {
          (config.preampGainDb * 100.0).roundToInt()
        } else {
          0
        }
        val targetMb = (normGainMb + preampMb).coerceIn(0, 1000)
        loudness.enabled = targetMb > 0
        if (targetMb > 0) {
          loudness.setTargetGain(targetMb)
        }
      }
    }

    return mapOf(
      "sessionId" to audioSessionId,
      "equalizerReady" to (equalizer != null),
      "bassBoostReady" to (bassBoostEffect != null),
      "virtualizerReady" to (virtualizerEffect != null),
      "loudnessReady" to (loudnessEnhancer != null)
    )
  }

  @Synchronized
  fun releaseEffects() {
    runCatching { equalizer?.release() }
    runCatching { bassBoostEffect?.release() }
    runCatching { virtualizerEffect?.release() }
    runCatching { loudnessEnhancer?.release() }
    equalizer = null
    bassBoostEffect = null
    virtualizerEffect = null
    loudnessEnhancer = null
    audioSessionId = 0
  }
}

