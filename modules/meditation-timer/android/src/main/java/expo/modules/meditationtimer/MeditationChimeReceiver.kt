package expo.modules.meditationtimer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.os.PowerManager

class MeditationChimeReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val pendingResult = goAsync()
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    val wakeLock = powerManager.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK,
      "${context.packageName}:meditation-chime"
    ).apply { acquire(10_000L) }

    var player: MediaPlayer? = null
    var finished = false

    fun finish() {
      if (finished) return
      finished = true
      player?.release()
      player = null
      if (wakeLock.isHeld) wakeLock.release()
      pendingResult.finish()
    }

    try {
      val sound = context.resources.openRawResourceFd(R.raw.meditation_chime)
      player = MediaPlayer().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
        setDataSource(sound.fileDescriptor, sound.startOffset, sound.length)
        sound.close()
        setOnCompletionListener { finish() }
        setOnErrorListener { _, _, _ ->
          finish()
          true
        }
        prepare()
        start()
      }
      Handler(Looper.getMainLooper()).postDelayed({ finish() }, 7_000L)
    } catch (_: Exception) {
      finish()
    }
  }
}
