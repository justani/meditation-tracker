package expo.modules.meditationwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.drawable.Icon
import android.os.Build
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews

private data class MeditationWidgetCopy(
  val streakLabel: String,
  val morningLabel: String,
  val eveningLabel: String,
  val morningCompleteDescription: String,
  val morningPendingDescription: String,
  val eveningCompleteDescription: String,
  val eveningPendingDescription: String,
)

class MeditationWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    if (appWidgetIds.isNotEmpty()) {
      MeditationWidgetStore.markEverAdded(context)
    }
    appWidgetIds.forEach { appWidgetId ->
      render(context, appWidgetManager, appWidgetId)
    }
    MeditationWidgetRefreshScheduler.scheduleNext(context)
  }

  override fun onEnabled(context: Context) {
    MeditationWidgetStore.markEverAdded(context)
    updateAll(context)
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: android.os.Bundle,
  ) {
    render(context, appWidgetManager, appWidgetId)
  }

  override fun onDisabled(context: Context) {
    MeditationWidgetRefreshScheduler.cancel(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)

    if (intent.action in REFRESH_ACTIONS) {
      updateAll(context)
    }
  }

  companion object {
    private val REFRESH_ACTIONS = setOf(
      Intent.ACTION_DATE_CHANGED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      Intent.ACTION_LOCALE_CHANGED,
      Intent.ACTION_CONFIGURATION_CHANGED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      Intent.ACTION_BOOT_COMPLETED,
      MeditationWidgetRefreshScheduler.ACTION_DAILY_REFRESH,
    )

    fun updateAll(context: Context) {
      val appWidgetManager = AppWidgetManager.getInstance(context)
      val componentName = ComponentName(context, MeditationWidgetProvider::class.java)
      val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
      if (appWidgetIds.isNotEmpty()) {
        MeditationWidgetStore.markEverAdded(context)
      }
      appWidgetIds.forEach { appWidgetId ->
        render(context, appWidgetManager, appWidgetId)
      }
      MeditationWidgetRefreshScheduler.scheduleNext(context)
    }

    private fun render(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetId: Int,
    ) {
      val state = MeditationWidgetStore.load(context)
      val usesAutomaticNightMode = state.theme == "auto" &&
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
      val layoutId = if (usesAutomaticNightMode) {
        R.layout.meditation_widget_light
      } else if (isDark(context, state.theme)) {
        R.layout.meditation_widget_dark
      } else {
        R.layout.meditation_widget_light
      }
      val views = RemoteViews(context.packageName, layoutId)
      val copy = localizedCopy(context, state.language)

      if (usesAutomaticNightMode) {
        configureAutomaticTheme(context, views)
      }

      views.setTextViewText(R.id.widget_streak_number, state.currentStreak.toString())
      views.setTextViewText(R.id.widget_streak_label, copy.streakLabel)
      views.setTextViewText(R.id.widget_quote, state.quote)
      views.setTextViewText(R.id.widget_morning_label, copy.morningLabel)
      views.setTextViewText(R.id.widget_evening_label, copy.eveningLabel)
      configureLegacyTextSizing(
        context,
        views,
        state.currentStreak,
        state.language,
        state.quote,
      )
      views.setViewVisibility(
        R.id.widget_morning_check,
        if (state.morningCompleted) View.VISIBLE else View.GONE,
      )
      views.setViewVisibility(
        R.id.widget_evening_check,
        if (state.eveningCompleted) View.VISIBLE else View.GONE,
      )
      views.setContentDescription(
        R.id.widget_morning_icon,
        if (state.morningCompleted) {
          copy.morningCompleteDescription
        } else {
          copy.morningPendingDescription
        },
      )
      views.setContentDescription(
        R.id.widget_evening_icon,
        if (state.eveningCompleted) {
          copy.eveningCompleteDescription
        } else {
          copy.eveningPendingDescription
        },
      )

      context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launchIntent ->
        launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        val pendingIntent = PendingIntent.getActivity(
          context,
          0,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.meditation_widget_root, pendingIntent)
      }

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun configureLegacyTextSizing(
      context: Context,
      views: RemoteViews,
      currentStreak: Int,
      language: String,
      quote: String,
    ) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) return

      val fontScale = context.resources.configuration.fontScale
      val usesLargeText = fontScale >= 1.25f
      val streakSize = when {
        usesLargeText -> 40f
        currentStreak >= 100 -> 38f
        currentStreak >= 10 -> 44f
        else -> 48f
      }
      val streakLabelSize = when {
        usesLargeText -> 11f
        language == "hindi" -> 10f
        else -> 14f
      }
      val quoteSize = when {
        quote.length >= 100 -> 13f
        quote.length >= 75 -> 14f
        quote.length >= 55 -> 15f
        else -> 17f
      }

      views.setTextViewTextSize(
        R.id.widget_streak_number,
        TypedValue.COMPLEX_UNIT_SP,
        streakSize,
      )
      views.setTextViewTextSize(
        R.id.widget_streak_label,
        TypedValue.COMPLEX_UNIT_SP,
        streakLabelSize,
      )
      views.setTextViewTextSize(
        R.id.widget_quote,
        TypedValue.COMPLEX_UNIT_SP,
        quoteSize,
      )
    }

    private fun configureAutomaticTheme(context: Context, views: RemoteViews) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return

      views.setIcon(
        R.id.widget_background,
        "setImageIcon",
        Icon.createWithResource(context, R.drawable.meditation_widget_background_light),
        Icon.createWithResource(context, R.drawable.meditation_widget_background_dark),
      )
      views.setColorInt(
        R.id.widget_streak_number,
        "setTextColor",
        context.getColor(R.color.meditation_widget_streak_light),
        context.getColor(R.color.meditation_widget_streak_dark),
      )
      views.setColorInt(
        R.id.widget_streak_label,
        "setTextColor",
        context.getColor(R.color.meditation_widget_light_muted),
        context.getColor(R.color.meditation_widget_dark_muted),
      )
      views.setColorInt(
        R.id.widget_divider,
        "setBackgroundColor",
        context.getColor(R.color.meditation_widget_light_divider),
        context.getColor(R.color.meditation_widget_dark_divider),
      )
      views.setColorInt(
        R.id.widget_quote,
        "setTextColor",
        context.getColor(R.color.meditation_widget_light_text),
        context.getColor(R.color.meditation_widget_dark_text),
      )
      views.setColorInt(
        R.id.widget_morning_label,
        "setTextColor",
        context.getColor(R.color.meditation_widget_light_muted),
        context.getColor(R.color.meditation_widget_dark_muted),
      )
      views.setIcon(
        R.id.widget_morning_icon,
        "setImageIcon",
        Icon.createWithResource(context, R.drawable.ic_meditation_widget_sun),
        Icon.createWithResource(context, R.drawable.ic_meditation_widget_sun_dark),
      )
      views.setIcon(
        R.id.widget_evening_disc,
        "setImageIcon",
        Icon.createWithResource(context, R.drawable.meditation_widget_disc_pending_light),
        Icon.createWithResource(context, R.drawable.meditation_widget_disc_pending_dark),
      )
      views.setIcon(
        R.id.widget_evening_icon,
        "setImageIcon",
        Icon.createWithResource(context, R.drawable.ic_meditation_widget_moon_light),
        Icon.createWithResource(context, R.drawable.ic_meditation_widget_moon_dark),
      )
      views.setColorInt(
        R.id.widget_evening_label,
        "setTextColor",
        context.getColor(R.color.meditation_widget_light_muted),
        context.getColor(R.color.meditation_widget_dark_muted),
      )
    }

    private fun localizedCopy(context: Context, language: String): MeditationWidgetCopy =
      if (language == "hindi") {
        MeditationWidgetCopy(
          streakLabel = context.getString(R.string.meditation_widget_streak_label_hi),
          morningLabel = context.getString(R.string.meditation_widget_morning_hi),
          eveningLabel = context.getString(R.string.meditation_widget_evening_hi),
          morningCompleteDescription =
            context.getString(R.string.meditation_widget_morning_complete_hi),
          morningPendingDescription =
            context.getString(R.string.meditation_widget_morning_pending_hi),
          eveningCompleteDescription =
            context.getString(R.string.meditation_widget_evening_complete_hi),
          eveningPendingDescription =
            context.getString(R.string.meditation_widget_evening_pending_hi),
        )
      } else {
        MeditationWidgetCopy(
          streakLabel = context.getString(R.string.meditation_widget_streak_label),
          morningLabel = context.getString(R.string.meditation_widget_morning),
          eveningLabel = context.getString(R.string.meditation_widget_evening),
          morningCompleteDescription =
            context.getString(R.string.meditation_widget_morning_complete),
          morningPendingDescription =
            context.getString(R.string.meditation_widget_morning_pending),
          eveningCompleteDescription =
            context.getString(R.string.meditation_widget_evening_complete),
          eveningPendingDescription =
            context.getString(R.string.meditation_widget_evening_pending),
        )
      }

    private fun isDark(context: Context, theme: String): Boolean = when (theme) {
      "dark" -> true
      "light" -> false
      else -> (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
        Configuration.UI_MODE_NIGHT_YES
    }
  }
}
