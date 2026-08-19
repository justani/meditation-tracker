package expo.modules.meditationwidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import java.util.Calendar

internal object MeditationWidgetRefreshScheduler {
  const val ACTION_DAILY_REFRESH =
    "expo.modules.meditationwidget.action.DAILY_REFRESH"
  private const val REQUEST_CODE = 2108

  fun scheduleNext(context: Context) {
    if (!hasWidgets(context)) {
      cancel(context)
      return
    }

    val nextRefresh = Calendar.getInstance().apply {
      add(Calendar.DAY_OF_YEAR, 1)
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 1)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.setAndAllowWhileIdle(
      AlarmManager.RTC_WAKEUP,
      nextRefresh.timeInMillis,
      refreshIntent(context),
    )
  }

  fun cancel(context: Context) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.cancel(refreshIntent(context))
  }

  private fun hasWidgets(context: Context): Boolean {
    val component = ComponentName(context, MeditationWidgetProvider::class.java)
    return AppWidgetManager.getInstance(context).getAppWidgetIds(component).isNotEmpty()
  }

  private fun refreshIntent(context: Context): PendingIntent {
    val intent = Intent(context, MeditationWidgetProvider::class.java).apply {
      action = ACTION_DAILY_REFRESH
    }
    return PendingIntent.getBroadcast(
      context,
      REQUEST_CODE,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
