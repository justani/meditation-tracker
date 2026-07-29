package expo.modules.meditationtimer

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock

internal object MeditationAlarmScheduler {
  private const val PREFERENCES_NAME = "meditation_timer_alarms"
  private const val WALL_TIMESTAMPS_KEY = "timestamps"
  private const val ELAPSED_TIMESTAMPS_KEY = "elapsed_timestamps"
  private const val MAX_ALARMS = 25
  private const val TEST_REQUEST_CODE = 10_000
  private const val SHOW_TIMER_REQUEST_CODE = 20_000

  fun scheduleAll(context: Context, wallTimestamps: List<Long>, persist: Boolean) {
    val elapsedNow = SystemClock.elapsedRealtime()
    val wallNow = System.currentTimeMillis()
    val elapsedTimestamps = wallTimestamps.map { timestamp ->
      elapsedNow + (timestamp - wallNow).coerceAtLeast(0L)
    }
    scheduleTargets(context, wallTimestamps, elapsedTimestamps, persist)
  }

  fun scheduleTest(context: Context, timestamp: Long) {
    cancel(context, TEST_REQUEST_CODE)
    scheduleAlarmClock(context, timestamp, TEST_REQUEST_CODE)
  }

  fun cancelAll(context: Context) {
    cancelScheduledChimes(context)
    cancel(context, TEST_REQUEST_CODE)
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .edit()
      .remove(WALL_TIMESTAMPS_KEY)
      .remove(ELAPSED_TIMESTAMPS_KEY)
      .apply()
  }

  fun restoreAfterBoot(context: Context) {
    val now = System.currentTimeMillis()
    val futureWallTimestamps = loadTimestamps(context, WALL_TIMESTAMPS_KEY)
      .filter { it > now }

    if (futureWallTimestamps.isEmpty()) {
      clearStoredTargets(context)
      return
    }

    val elapsedNow = SystemClock.elapsedRealtime()
    val elapsedTimestamps = futureWallTimestamps.map { timestamp ->
      elapsedNow + (timestamp - now)
    }
    persistTargets(context, futureWallTimestamps, elapsedTimestamps)

    if (canScheduleExactAlarms(context)) {
      scheduleTargets(context, futureWallTimestamps, elapsedTimestamps, persist = false)
    }
  }

  fun restoreAfterPermissionGrant(context: Context) {
    if (!canScheduleExactAlarms(context)) return
    rescheduleFromElapsedTargets(context)
  }

  fun rescheduleAfterClockChange(context: Context) {
    if (!canScheduleExactAlarms(context)) return
    rescheduleFromElapsedTargets(context)
  }

  fun reconcileActive(context: Context): List<Long> {
    if (!canScheduleExactAlarms(context)) return emptyList()
    return rescheduleFromElapsedTargets(context)
  }

  private fun rescheduleFromElapsedTargets(context: Context): List<Long> {
    val elapsedNow = SystemClock.elapsedRealtime()
    val wallNow = System.currentTimeMillis()
    val futureElapsedTimestamps = loadTimestamps(context, ELAPSED_TIMESTAMPS_KEY)
      .filter { it > elapsedNow }

    if (futureElapsedTimestamps.isEmpty()) {
      val futureWallTimestamps = loadTimestamps(context, WALL_TIMESTAMPS_KEY)
        .filter { it > wallNow }
      if (futureWallTimestamps.isEmpty()) {
        clearStoredTargets(context)
      } else {
        scheduleAll(context, futureWallTimestamps, persist = true)
      }
      return futureWallTimestamps
    }

    val correctedWallTimestamps = futureElapsedTimestamps.map { timestamp ->
      wallNow + (timestamp - elapsedNow)
    }
    scheduleTargets(
      context,
      correctedWallTimestamps,
      futureElapsedTimestamps,
      persist = true
    )
    return correctedWallTimestamps
  }

  private fun scheduleTargets(
    context: Context,
    wallTimestamps: List<Long>,
    elapsedTimestamps: List<Long>,
    persist: Boolean
  ) {
    require(wallTimestamps.size <= MAX_ALARMS) { "At most $MAX_ALARMS chimes may be scheduled" }
    require(wallTimestamps.size == elapsedTimestamps.size) { "Alarm target lists must match" }

    cancelScheduledChimes(context)
    wallTimestamps.forEachIndexed { index, timestamp ->
      scheduleAlarmClock(context, timestamp, index)
    }

    if (persist) persistTargets(context, wallTimestamps, elapsedTimestamps)
  }

  private fun scheduleAlarmClock(context: Context, timestamp: Long, requestCode: Int) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val alarmInfo = AlarmManager.AlarmClockInfo(timestamp, timerScreenPendingIntent(context))
    alarmManager.setAlarmClock(
      alarmInfo,
      requireNotNull(chimePendingIntent(context, requestCode, PendingIntent.FLAG_UPDATE_CURRENT))
    )
  }

  private fun cancel(context: Context, requestCode: Int) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pendingIntent = chimePendingIntent(context, requestCode, PendingIntent.FLAG_NO_CREATE)
    if (pendingIntent != null) {
      alarmManager.cancel(pendingIntent)
      pendingIntent.cancel()
    }
  }

  private fun cancelScheduledChimes(context: Context) {
    repeat(MAX_ALARMS) { cancel(context, it) }
  }

  private fun chimePendingIntent(
    context: Context,
    requestCode: Int,
    lookupFlag: Int
  ): PendingIntent? {
    val intent = Intent(context, MeditationChimeReceiver::class.java)
      .setAction("${context.packageName}.MEDITATION_CHIME.$requestCode")
    return PendingIntent.getBroadcast(
      context,
      requestCode,
      intent,
      lookupFlag or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun timerScreenPendingIntent(context: Context): PendingIntent {
    val launchIntent = requireNotNull(
      context.packageManager.getLaunchIntentForPackage(context.packageName)
    ).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    return PendingIntent.getActivity(
      context,
      SHOW_TIMER_REQUEST_CODE,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun canScheduleExactAlarms(context: Context): Boolean {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
  }

  private fun persistTargets(
    context: Context,
    wallTimestamps: List<Long>,
    elapsedTimestamps: List<Long>
  ) {
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(WALL_TIMESTAMPS_KEY, wallTimestamps.joinToString(","))
      .putString(ELAPSED_TIMESTAMPS_KEY, elapsedTimestamps.joinToString(","))
      .apply()
  }

  private fun loadTimestamps(context: Context, key: String): List<Long> =
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .getString(key, null)
      ?.split(",")
      ?.mapNotNull(String::toLongOrNull)
      ?: emptyList()

  private fun clearStoredTargets(context: Context) {
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .edit()
      .remove(WALL_TIMESTAMPS_KEY)
      .remove(ELAPSED_TIMESTAMPS_KEY)
      .apply()
  }
}
