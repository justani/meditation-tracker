package expo.modules.meditationwidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MeditationWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MeditationWidget")

    AsyncFunction("updateAsync") {
      currentStreak: Int,
      quotes: List<String>,
      morningCompleted: Boolean,
      eveningCompleted: Boolean,
      theme: String,
      snapshotDate: String,
      streakValidThrough: String,
      language: String ->
      val context = requireContext()
      MeditationWidgetStore.save(
        context = context,
        currentStreak = currentStreak,
        quotes = quotes,
        morningCompleted = morningCompleted,
        eveningCompleted = eveningCompleted,
        theme = theme,
        snapshotDate = snapshotDate,
        streakValidThrough = streakValidThrough,
        language = language,
      )
      MeditationWidgetProvider.updateAll(context)
    }

    AsyncFunction("isAddedAsync") {
      val context = requireContext()
      val componentName = ComponentName(context, MeditationWidgetProvider::class.java)
      val isAdded = AppWidgetManager.getInstance(context)
        .getAppWidgetIds(componentName)
        .isNotEmpty()
      if (isAdded) {
        MeditationWidgetStore.markEverAdded(context)
      }
      isAdded
    }

    AsyncFunction("wasEverAddedAsync") {
      MeditationWidgetStore.wasEverAdded(requireContext())
    }

    AsyncFunction("canRequestPinAsync") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        false
      } else {
        AppWidgetManager.getInstance(requireContext()).isRequestPinAppWidgetSupported
      }
    }

    AsyncFunction("requestPinAsync") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        false
      } else {
        val context = requireContext()
        val appWidgetManager = AppWidgetManager.getInstance(context)
        if (!appWidgetManager.isRequestPinAppWidgetSupported) {
          false
        } else {
          val componentName = ComponentName(context, MeditationWidgetProvider::class.java)
          appWidgetManager.requestPinAppWidget(componentName, null, null)
        }
      }
    }
  }

  private fun requireContext(): Context =
    appContext.reactContext?.applicationContext
      ?: throw CodedException(
        "ERR_MEDITATION_WIDGET_CONTEXT",
        "Android application context is unavailable",
        null,
      )
}
