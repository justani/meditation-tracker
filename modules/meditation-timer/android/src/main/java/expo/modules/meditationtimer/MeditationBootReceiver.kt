package expo.modules.meditationtimer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class MeditationBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
      MeditationAlarmScheduler.restoreAfterBoot(context)
    }
  }
}
