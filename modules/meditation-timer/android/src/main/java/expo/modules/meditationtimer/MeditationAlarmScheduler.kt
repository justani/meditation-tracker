package expo.modules.meditationtimer

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

internal object MeditationAlarmScheduler {
  private const val PREFERENCES_NAME = "meditation_timer_alarms"
  private const val TIMESTAMPS_KEY = "timestamps"
  private const val MAX_ALARMS = 25
  private const val TEST_REQUEST_CODE = 10_000

  fun scheduleAll(context: Context, timestamps: List<Long>, persist: Boolean) {
    require(timestamps.size <= MAX_ALARMS) { "At most $MAX_ALARMS chimes may be scheduled" }

    timestamps.forEachIndexed { index, timestamp ->
      scheduleExact(context, timestamp, index)
    }

    if (persist) {
      context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(TIMESTAMPS_KEY, timestamps.joinToString(","))
        .apply()
    }
  }

  fun scheduleTest(context: Context, timestamp: Long) {
    cancel(context, TEST_REQUEST_CODE)
    scheduleExact(context, timestamp, TEST_REQUEST_CODE)
  }

  fun cancelAll(context: Context) {
    repeat(MAX_ALARMS) { cancel(context, it) }
    cancel(context, TEST_REQUEST_CODE)
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .edit()
      .remove(TIMESTAMPS_KEY)
      .apply()
  }

  fun restoreAfterBoot(context: Context) {
    val stored = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .getString(TIMESTAMPS_KEY, null)
      ?: return
    val now = System.currentTimeMillis()
    val futureTimestamps = stored.split(",")
      .mapNotNull(String::toLongOrNull)
      .filter { it > now }

    if (futureTimestamps.isEmpty()) {
      context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        .edit()
        .remove(TIMESTAMPS_KEY)
        .apply()
      return
    }

    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()) {
      scheduleAll(context, futureTimestamps, persist = true)
    }
  }

  private fun scheduleExact(context: Context, timestamp: Long, requestCode: Int) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.setExactAndAllowWhileIdle(
      AlarmManager.RTC_WAKEUP,
      timestamp,
      requireNotNull(pendingIntent(context, requestCode, PendingIntent.FLAG_UPDATE_CURRENT))
    )
  }

  private fun cancel(context: Context, requestCode: Int) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pendingIntent = pendingIntent(context, requestCode, PendingIntent.FLAG_NO_CREATE)
    if (pendingIntent != null) {
      alarmManager.cancel(pendingIntent)
      pendingIntent.cancel()
    }
  }

  private fun pendingIntent(context: Context, requestCode: Int, lookupFlag: Int): PendingIntent? {
    val intent = Intent(context, MeditationChimeReceiver::class.java)
      .setAction("${context.packageName}.MEDITATION_CHIME.$requestCode")
    return PendingIntent.getBroadcast(
      context,
      requestCode,
      intent,
      lookupFlag or PendingIntent.FLAG_IMMUTABLE
    )
  }
}
