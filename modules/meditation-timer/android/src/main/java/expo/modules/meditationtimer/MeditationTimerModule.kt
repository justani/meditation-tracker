package expo.modules.meditationtimer

import android.app.AlarmManager
import android.content.Context
import android.os.Build
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MeditationTimerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MeditationTimer")

    AsyncFunction("scheduleAsync") { timestamps: List<Double> ->
      val context = requireContext()
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
        throw ExactAlarmPermissionException()
      }

      MeditationAlarmScheduler.cancelAll(context)
      val timestampsMillis = timestamps.map { it.toLong() }
      MeditationAlarmScheduler.scheduleAll(context, timestampsMillis, persist = true)
    }

    AsyncFunction("scheduleTestAsync") {
      val context = requireContext()
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
        throw ExactAlarmPermissionException()
      }

      MeditationAlarmScheduler.scheduleTest(context, System.currentTimeMillis() + 2_000L)
    }

    AsyncFunction("cancelAsync") {
      MeditationAlarmScheduler.cancelAll(requireContext())
    }

    AsyncFunction("canScheduleExactAlarmsAsync") {
      val context = requireContext()
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
    }
  }

  private fun requireContext(): Context =
    appContext.reactContext?.applicationContext
      ?: throw CodedException("ERR_MEDITATION_TIMER_CONTEXT", "Android application context is unavailable", null)
}

private class ExactAlarmPermissionException : CodedException(
  "ERR_EXACT_ALARM_PERMISSION",
  "Allow Alarms & reminders for reliable meditation chimes",
  null
)
