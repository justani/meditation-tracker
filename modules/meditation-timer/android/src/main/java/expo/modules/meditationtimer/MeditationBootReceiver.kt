package expo.modules.meditationtimer

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class MeditationBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED -> MeditationAlarmScheduler.restoreAfterBoot(context)
      Intent.ACTION_TIME_CHANGED -> MeditationAlarmScheduler.rescheduleAfterClockChange(context)
      AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED ->
        MeditationAlarmScheduler.restoreAfterPermissionGrant(context)
    }
  }
}
